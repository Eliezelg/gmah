import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { UpdateWithdrawalRequestDto } from './dto/update-withdrawal-request.dto';
import { ApproveWithdrawalRequestDto, RejectWithdrawalRequestDto } from './dto/approve-withdrawal-request.dto';
import { WithdrawalQueryDto } from './dto/withdrawal-query.dto';
import { WithdrawalStatus, ApprovalMode, Role, TreasuryFlowType, TreasuryFlowCategory } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WithdrawalsService {
  constructor(private prisma: PrismaService) {}

  // Configuration - these could be moved to SystemConfig
  private readonly AUTO_APPROVAL_THRESHOLD = new Decimal('1000'); // Auto-approve below 1000 ILS
  private readonly MANUAL_APPROVAL_ROLES = [Role.ADMIN, Role.TREASURER];
  
  async create(createWithdrawalDto: CreateWithdrawalRequestDto, userId: string) {
    // Verify the deposit exists and belongs to the user
    const deposit = await this.prisma.deposit.findFirst({
      where: {
        id: createWithdrawalDto.depositId,
        depositorId: userId,
        isActive: true,
      },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found or not accessible');
    }

    // Check if requested amount is available
    if (createWithdrawalDto.amount.gt(deposit.currentBalance)) {
      throw new BadRequestException('Requested amount exceeds available balance');
    }

    // Generate unique request number
    const requestNumber = await this.generateRequestNumber();

    // Determine approval mode based on amount and urgency
    const approvalMode = this.determineApprovalMode(
      createWithdrawalDto.amount,
      createWithdrawalDto.urgency || 'NORMAL'
    );

    // Calculate treasury impact
    const treasuryImpact = await this.calculateTreasuryImpact(
      createWithdrawalDto.amount,
      createWithdrawalDto.plannedDate
    );

    const withdrawalRequest = await this.prisma.withdrawalRequest.create({
      data: {
        requestNumber,
        depositId: createWithdrawalDto.depositId,
        depositorId: userId,
        amount: createWithdrawalDto.amount,
        reason: createWithdrawalDto.reason,
        reasonCategory: createWithdrawalDto.reasonCategory,
        urgency: createWithdrawalDto.urgency || 'NORMAL',
        plannedDate: createWithdrawalDto.plannedDate ? new Date(createWithdrawalDto.plannedDate) : null,
        paymentMethod: createWithdrawalDto.paymentMethod,
        bankDetails: createWithdrawalDto.bankDetails,
        approvalMode,
        treasuryImpact,
        requiresApproval: approvalMode !== ApprovalMode.AUTOMATIC,
        autoApproved: approvalMode === ApprovalMode.AUTOMATIC,
        status: approvalMode === ApprovalMode.AUTOMATIC ? WithdrawalStatus.APPROVED : WithdrawalStatus.PENDING,
        approvalDate: approvalMode === ApprovalMode.AUTOMATIC ? new Date() : null,
        metadata: createWithdrawalDto.metadata,
      },
      include: {
        deposit: true,
        depositor: true,
      },
    });

    // Create treasury flow projection
    await this.createTreasuryFlow(withdrawalRequest);

    // Create audit log
    await this.createAuditLog(withdrawalRequest.id, userId, 'CREATE', null, withdrawalRequest);

    // Auto-approve if applicable
    if (approvalMode === ApprovalMode.AUTOMATIC) {
      await this.processAutoApproval(withdrawalRequest.id);
    }

    return withdrawalRequest;
  }

  async findAll(query: WithdrawalQueryDto, userId?: string, userRole?: Role) {
    const where: any = {};
    
    // Role-based filtering
    if (userRole === Role.ADMIN || userRole === Role.TREASURER || userRole === Role.SUPER_ADMIN) {
      // Admin/Treasurer can see all
    } else {
      // Regular users can only see their own
      where.depositorId = userId;
    }

    // Apply query filters
    if (query.status) where.status = query.status;
    if (query.approvalMode) where.approvalMode = query.approvalMode;
    if (query.depositorId && (userRole === Role.ADMIN || userRole === Role.TREASURER)) {
      where.depositorId = query.depositorId;
    }
    if (query.depositId) where.depositId = query.depositId;
    if (query.fromDate) where.requestDate = { ...where.requestDate, gte: new Date(query.fromDate) };
    if (query.toDate) where.requestDate = { ...where.requestDate, lte: new Date(query.toDate) };
    if (query.search) {
      where.OR = [
        { reason: { contains: query.search, mode: 'insensitive' } },
        { requestNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where,
        include: {
          deposit: true,
          depositor: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          approver: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: {
          [query.sortBy || 'requestDate']: query.sortOrder || 'desc',
        },
        skip: ((query.page || 1) - 1) * (query.limit || 10),
        take: query.limit || 10,
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    return {
      data: withdrawals,
      total,
      page: query.page || 1,
      limit: query.limit || 10,
      totalPages: Math.ceil(total / (query.limit || 10)),
    };
  }

  async findOne(id: string, userId?: string, userRole?: Role) {
    const withdrawalRequest = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      include: {
        deposit: true,
        depositor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
        rejecter: {
          select: { id: true, firstName: true, lastName: true },
        },
        documents: true,
        treasuryFlows: true,
      },
    });

    if (!withdrawalRequest) {
      throw new NotFoundException('Withdrawal request not found');
    }

    // Check access rights
    const canAccess = 
      userRole === Role.ADMIN || 
      userRole === Role.TREASURER || 
      userRole === Role.SUPER_ADMIN || 
      withdrawalRequest.depositorId === userId;

    if (!canAccess) {
      throw new ForbiddenException('Access denied to this withdrawal request');
    }

    return withdrawalRequest;
  }

  async update(id: string, updateWithdrawalDto: UpdateWithdrawalRequestDto, userId: string) {
    const existingRequest = await this.findOne(id, userId);
    
    // Only allow updates to pending requests and only by the depositor
    if (existingRequest.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Cannot update non-pending withdrawal request');
    }

    if (existingRequest.depositorId !== userId) {
      throw new ForbiddenException('Can only update your own withdrawal requests');
    }

    const oldValues = { ...existingRequest };
    
    const updatedRequest = await this.prisma.withdrawalRequest.update({
      where: { id },
      data: {
        ...updateWithdrawalDto,
        plannedDate: updateWithdrawalDto.plannedDate ? new Date(updateWithdrawalDto.plannedDate) : undefined,
      },
      include: {
        deposit: true,
        depositor: true,
      },
    });

    // Create audit log
    await this.createAuditLog(id, userId, 'UPDATE', oldValues, updatedRequest);

    return updatedRequest;
  }

  async approve(id: string, approveDto: ApproveWithdrawalRequestDto, approverId: string) {
    const withdrawalRequest = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      include: { deposit: true },
    });

    if (!withdrawalRequest) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawalRequest.status !== WithdrawalStatus.PENDING && withdrawalRequest.status !== WithdrawalStatus.UNDER_REVIEW) {
      throw new BadRequestException('Cannot approve non-pending withdrawal request');
    }

    // Check if amount is still available
    if (withdrawalRequest.amount.gt(withdrawalRequest.deposit.currentBalance)) {
      throw new BadRequestException('Requested amount exceeds current available balance');
    }

    const oldValues = { ...withdrawalRequest };
    
    const updatedRequest = await this.prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status: WithdrawalStatus.APPROVED,
        approvedBy: approverId,
        approvalDate: new Date(),
        approvalComments: approveDto.approvalComments,
        paymentMethod: approveDto.paymentMethod || withdrawalRequest.paymentMethod,
        bankDetails: approveDto.bankDetails || withdrawalRequest.bankDetails,
      },
      include: {
        deposit: true,
        depositor: true,
        approver: true,
      },
    });

    // Create audit log
    await this.createAuditLog(id, approverId, 'APPROVE', oldValues, updatedRequest);

    // TODO: Send notification to depositor
    // TODO: Update treasury flows

    return updatedRequest;
  }

  async reject(id: string, rejectDto: RejectWithdrawalRequestDto, rejecterId: string) {
    const withdrawalRequest = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
    });

    if (!withdrawalRequest) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawalRequest.status !== WithdrawalStatus.PENDING && withdrawalRequest.status !== WithdrawalStatus.UNDER_REVIEW) {
      throw new BadRequestException('Cannot reject non-pending withdrawal request');
    }

    const oldValues = { ...withdrawalRequest };
    
    const updatedRequest = await this.prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status: WithdrawalStatus.REJECTED,
        rejectedBy: rejecterId,
        rejectionDate: new Date(),
        rejectionReason: rejectDto.rejectionReason,
      },
      include: {
        deposit: true,
        depositor: true,
        rejecter: true,
      },
    });

    // Create audit log
    await this.createAuditLog(id, rejecterId, 'REJECT', oldValues, updatedRequest);

    // TODO: Send notification to depositor
    // TODO: Remove from treasury flows

    return updatedRequest;
  }

  async execute(id: string, executorId: string) {
    const withdrawalRequest = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      include: { deposit: true },
    });

    if (!withdrawalRequest) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawalRequest.status !== WithdrawalStatus.APPROVED) {
      throw new BadRequestException('Can only execute approved withdrawal requests');
    }

    // Start transaction to update deposit balance and withdrawal status
    const result = await this.prisma.$transaction(async (tx) => {
      // Update deposit balance
      const updatedDeposit = await tx.deposit.update({
        where: { id: withdrawalRequest.depositId },
        data: {
          currentBalance: withdrawalRequest.deposit.currentBalance.sub(withdrawalRequest.amount),
        },
      });

      // Update withdrawal status
      const updatedRequest = await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: WithdrawalStatus.PROCESSING,
          processingDate: new Date(),
        },
        include: {
          deposit: true,
          depositor: true,
        },
      });

      return { updatedRequest, updatedDeposit };
    });

    // Create audit log
    await this.createAuditLog(id, executorId, 'EXECUTE', withdrawalRequest, result.updatedRequest);

    // TODO: Initiate payment processing
    // TODO: Update treasury flows with actual transaction

    return result.updatedRequest;
  }

  async getTreasuryImpact(query?: { fromDate?: string; toDate?: string }) {
    const where: any = {
      status: {
        in: [WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING, WithdrawalStatus.PENDING],
      },
    };

    if (query?.fromDate) where.plannedDate = { gte: new Date(query.fromDate) };
    if (query?.toDate) where.plannedDate = { ...where.plannedDate, lte: new Date(query.toDate) };

    const withdrawals = await this.prisma.withdrawalRequest.findMany({
      where,
      select: {
        amount: true,
        plannedDate: true,
        status: true,
        urgency: true,
      },
    });

    // Calculate impact by status and urgency
    const impact = withdrawals.reduce((acc, withdrawal) => {
      const amount = withdrawal.amount.toNumber();
      const status = withdrawal.status;
      const urgency = withdrawal.urgency || 'NORMAL';

      if (!acc[status]) acc[status] = 0;
      if (!acc.byUrgency) acc.byUrgency = {};
      if (!acc.byUrgency[urgency]) acc.byUrgency[urgency] = 0;

      acc[status] += amount;
      acc.byUrgency[urgency] += amount;
      acc.total = (acc.total || 0) + amount;

      return acc;
    }, {} as any);

    return impact;
  }

  private async generateRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WR-${year}-`;
    
    const lastRequest = await this.prisma.withdrawalRequest.findFirst({
      where: {
        requestNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        requestNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastRequest) {
      const lastNumber = parseInt(lastRequest.requestNumber.replace(prefix, ''));
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
  }

  private determineApprovalMode(amount: Decimal, urgency: string): ApprovalMode {
    // Auto-approve small amounts for non-urgent requests
    if (amount.lte(this.AUTO_APPROVAL_THRESHOLD) && urgency !== 'URGENT') {
      return ApprovalMode.AUTOMATIC;
    }

    // Large amounts or urgent requests require manual approval
    if (amount.gt(new Decimal('10000')) || urgency === 'URGENT') {
      return ApprovalMode.COMMITTEE;
    }

    return ApprovalMode.MANUAL;
  }

  private async calculateTreasuryImpact(amount: Decimal, plannedDate?: string) {
    // This would integrate with the existing treasury forecast service
    // For now, return basic impact data
    return {
      amount: amount.toString(),
      plannedDate,
      category: 'DEPOSIT_WITHDRAWAL',
      estimatedImpact: amount.mul(-1).toString(), // Negative impact on treasury
      riskLevel: amount.gt(new Decimal('5000')) ? 'HIGH' : 'LOW',
    };
  }

  private async createTreasuryFlow(withdrawalRequest: any) {
    return await this.prisma.treasuryFlow.create({
      data: {
        type: TreasuryFlowType.OUTFLOW,
        category: TreasuryFlowCategory.DEPOSIT_WITHDRAWAL,
        amount: withdrawalRequest.amount,
        description: `Withdrawal request: ${withdrawalRequest.requestNumber}`,
        expectedDate: withdrawalRequest.plannedDate || new Date(),
        probability: withdrawalRequest.status === WithdrawalStatus.APPROVED ? 95 : 70,
        confidence: 85,
        withdrawalId: withdrawalRequest.id,
        source: 'SYSTEM',
      },
    });
  }

  private async processAutoApproval(withdrawalRequestId: string) {
    // Additional logic for auto-approval processing
    // Could include notifications, treasury updates, etc.
    console.log(`Auto-approved withdrawal request: ${withdrawalRequestId}`);
  }

  private async createAuditLog(
    withdrawalId: string,
    userId: string,
    action: string,
    oldValues: any,
    newValues: any,
  ) {
    return await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: 'WithdrawalRequest',
        entityId: withdrawalId,
        withdrawalId,
        oldValues,
        newValues,
      },
    });
  }
}