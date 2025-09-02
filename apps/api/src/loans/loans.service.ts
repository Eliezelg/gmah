import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CacheService } from '../cache/cache.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { SubmitLoanDto } from './dto/submit-loan.dto';
import { ApproveLoanDto } from './dto/approve-loan.dto';
import { VoteLoanDto } from './dto/vote-loan.dto';
import { DisburseLoanDto } from './dto/disburse-loan.dto';
import { Loan, LoanStatus, Role, Prisma, ApprovalVoteType } from '@prisma/client';

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly cacheService: CacheService,
  ) {}

  async create(createLoanDto: CreateLoanDto, borrowerId: string): Promise<Loan> {
    // Check if user has active loans
    const activeLoans = await this.prisma.loan.count({
      where: {
        borrowerId,
        status: {
          in: [LoanStatus.ACTIVE, LoanStatus.DISBURSED],
        },
      },
    });

    if (activeLoans >= 3) {
      throw new BadRequestException('You cannot have more than 3 active loans');
    }

    // Check loan limits based on user profile
    const userProfile = await this.prisma.profile.findUnique({
      where: { userId: borrowerId },
    });

    if (userProfile?.maxLoanAmount && createLoanDto.amount > Number(userProfile.maxLoanAmount)) {
      throw new BadRequestException(`Loan amount exceeds your maximum limit of ${userProfile.maxLoanAmount}`);
    }

    // Generate unique loan number
    const loanNumber = await this.generateLoanNumber();

    // Calculate repayment schedule
    const installmentAmount = createLoanDto.amount / createLoanDto.numberOfInstallments;

    const loan = await this.prisma.loan.create({
      data: {
        loanNumber,
        borrowerId,
        amount: createLoanDto.amount,
        type: createLoanDto.type,
        purpose: createLoanDto.purpose,
        purposeDetails: createLoanDto.purposeDetails,
        numberOfInstallments: createLoanDto.numberOfInstallments,
        installmentAmount,
        expectedEndDate: createLoanDto.expectedEndDate,
        status: LoanStatus.DRAFT,
        outstandingAmount: createLoanDto.amount,
      },
      include: {
        borrower: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create repayment schedule
    await this.createRepaymentSchedule(loan.id, createLoanDto.amount, createLoanDto.numberOfInstallments, createLoanDto.expectedEndDate);

    return loan;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.LoanWhereInput;
    orderBy?: Prisma.LoanOrderByWithRelationInput;
    userRole?: Role;
    userId?: string;
  }): Promise<{ loans: Loan[]; total: number }> {
    const { skip = 0, take = 10, where, orderBy = { createdAt: 'desc' }, userRole, userId } = params;

    // Filter based on user role
    let finalWhere = { ...where };
    
    if (userRole === Role.BORROWER && userId) {
      finalWhere = { ...finalWhere, borrowerId: userId };
    } else if (userRole === Role.GUARANTOR && userId) {
      finalWhere = {
        ...finalWhere,
        guarantees: {
          some: {
            guarantorId: userId,
          },
        },
      };
    }

    const [loans, total] = await Promise.all([
      this.prisma.loan.findMany({
        skip,
        take,
        where: finalWhere,
        orderBy,
        include: {
          borrower: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          guarantees: {
            include: {
              guarantor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          _count: {
            select: {
              approvalVotes: true,
              documents: true,
            },
          },
        },
      }),
      this.prisma.loan.count({ where: finalWhere }),
    ]);

    return { loans, total };
  }

  async findOne(id: string): Promise<Loan> {
    // Try to get from cache first
    const cachedLoan = await this.cacheService.getCachedLoan(id);
    if (cachedLoan) {
      return cachedLoan;
    }

    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        borrower: true,
        guarantees: {
          include: {
            guarantor: true,
            documents: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        repaymentSchedule: {
          orderBy: { dueDate: 'asc' },
        },
        documents: true,
        approvalVotes: {
          include: {
            voter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    // Cache the loan for future requests
    await this.cacheService.cacheLoan(id, loan);

    return loan;
  }

  async update(id: string, updateLoanDto: UpdateLoanDto, userId: string, userRole: Role): Promise<Loan> {
    const loan = await this.findOne(id);

    // Only allow updates in DRAFT status or by admin
    if (loan.status !== LoanStatus.DRAFT && userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('You can only update loans in DRAFT status');
    }

    // Borrower can only update their own loans
    if (userRole === Role.BORROWER && loan.borrowerId !== userId) {
      throw new ForbiddenException('You can only update your own loans');
    }

    const updatedLoan = await this.prisma.loan.update({
      where: { id },
      data: updateLoanDto as any,
    });

    // Invalidate cache
    await this.cacheService.invalidateLoan(id);
    await this.cacheService.del(`stats:loans:${userId}`);

    return updatedLoan;
  }

  async submitForApproval(id: string, submitDto: SubmitLoanDto, userId: string): Promise<Loan> {
    const loan = await this.findOne(id);

    if (loan.borrowerId !== userId) {
      throw new ForbiddenException('You can only submit your own loans');
    }

    if (loan.status !== LoanStatus.DRAFT) {
      throw new BadRequestException('Loan must be in DRAFT status to submit');
    }

    // Check if required documents are uploaded (skip for testing)
    const skipDocumentCheck = process.env.NODE_ENV === 'development' && submitDto.skipDocumentCheck;
    
    if (!skipDocumentCheck) {
      const documentCount = await this.prisma.document.count({
        where: { loanId: id },
      });

      if (documentCount < 1) {
        throw new BadRequestException('Please upload required documents before submitting');
      }
    }

    // Check if guarantees are in place (if required)
    if (submitDto.requiresGuarantee) {
      const guaranteeCount = await this.prisma.guarantee.count({
        where: { 
          loanId: id,
          status: 'PENDING',
        },
      });

      if (guaranteeCount < 1) {
        throw new BadRequestException('At least one guarantee is required for this loan');
      }
    }

    return this.prisma.loan.update({
      where: { id },
      data: {
        status: LoanStatus.SUBMITTED,
        reviewStartDate: new Date(),
      },
    });
  }

  async approveLoan(id: string, approveDto: ApproveLoanDto, userId: string): Promise<Loan> {
    const loan = await this.findOne(id);

    if (loan.status !== LoanStatus.UNDER_REVIEW) {
      throw new BadRequestException('Loan must be under review to approve');
    }

    // Check if user has permission to approve
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const userRole = user?.role as Role;
    if (!user || (userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN && userRole !== Role.TREASURER)) {
      throw new ForbiddenException('You do not have permission to approve loans');
    }

    const updatedLoan = await this.prisma.loan.update({
      where: { id },
      data: {
        status: LoanStatus.APPROVED,
        approvalDate: new Date(),
        committeeNotes: approveDto.notes,
      },
      include: {
        borrower: true,
      },
    });

    // Send approval email notification
    if (updatedLoan.borrower.email) {
      await this.emailService.sendLoanStatusEmail(
        updatedLoan.borrower.email,
        updatedLoan.borrower.firstName,
        updatedLoan.loanNumber,
        'approved',
        approveDto.notes,
      );
    }

    // Send real-time notification
    await this.notificationsService.createNotification({
      userId: updatedLoan.borrowerId,
      title: 'Prêt approuvé',
      message: `Votre prêt ${updatedLoan.loanNumber} a été approuvé`,
      type: 'loan_approved',
      metadata: { loanId: id },
    });

    return updatedLoan;
  }

  async rejectLoan(id: string, reason: string, userId: string): Promise<Loan> {
    const loan = await this.findOne(id);

    const loanStatus = loan.status as LoanStatus;
    if (loanStatus !== LoanStatus.SUBMITTED && loanStatus !== LoanStatus.UNDER_REVIEW) {
      throw new BadRequestException('Loan cannot be rejected in current status');
    }

    // Check permission
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const userRole = user?.role as Role;
    if (!user || (userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN && userRole !== Role.TREASURER && userRole !== Role.COMMITTEE_MEMBER)) {
      throw new ForbiddenException('You do not have permission to reject loans');
    }

    const updatedLoan = await this.prisma.loan.update({
      where: { id },
      data: {
        status: LoanStatus.REJECTED,
        rejectionDate: new Date(),
        rejectionReason: reason,
      },
      include: {
        borrower: true,
      },
    });

    // Send rejection email notification
    if (updatedLoan.borrower.email) {
      await this.emailService.sendLoanStatusEmail(
        updatedLoan.borrower.email,
        updatedLoan.borrower.firstName,
        updatedLoan.loanNumber,
        'rejected',
        reason,
      );
    }

    // Send real-time notification
    await this.notificationsService.createNotification({
      userId: updatedLoan.borrowerId,
      title: 'Prêt rejeté',
      message: `Votre prêt ${updatedLoan.loanNumber} a été rejeté: ${reason}`,
      type: 'loan_rejected',
      metadata: { loanId: id, reason },
    });

    return updatedLoan;
  }

  async voteLoan(id: string, voteDto: VoteLoanDto, userId: string): Promise<any> {
    const loan = await this.findOne(id);

    if (loan.status !== LoanStatus.UNDER_REVIEW) {
      throw new BadRequestException('Loan must be under review for voting');
    }

    // Check if user is a committee member
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const userRole = user?.role as Role;
    if (!user || (userRole !== Role.COMMITTEE_MEMBER && userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN)) {
      throw new ForbiddenException('Only committee members can vote');
    }

    // Check if already voted
    const existingVote = await this.prisma.approvalVote.findUnique({
      where: {
        loanId_voterId: {
          loanId: id,
          voterId: userId,
        },
      },
    });

    if (existingVote) {
      throw new BadRequestException('You have already voted on this loan');
    }

    // Create vote
    const vote = await this.prisma.approvalVote.create({
      data: {
        loanId: id,
        voterId: userId,
        vote: voteDto.vote,
        comment: voteDto.comment,
      },
    });

    // Check if we have enough votes to make a decision
    const votes = await this.prisma.approvalVote.findMany({
      where: { loanId: id },
    });

    const approveVotes = votes.filter(v => v.vote === ApprovalVoteType.APPROVE).length;
    const rejectVotes = votes.filter(v => v.vote === ApprovalVoteType.REJECT).length;
    const totalVotes = votes.length;

    // If majority approves (more than 50%)
    if (approveVotes > totalVotes / 2) {
      await this.prisma.loan.update({
        where: { id },
        data: {
          status: LoanStatus.APPROVED,
          approvalDate: new Date(),
        },
      });
    } 
    // If majority rejects
    else if (rejectVotes > totalVotes / 2) {
      await this.prisma.loan.update({
        where: { id },
        data: {
          status: LoanStatus.REJECTED,
          rejectionDate: new Date(),
          rejectionReason: 'Rejected by committee vote',
        },
      });
    }

    return {
      vote,
      summary: {
        totalVotes,
        approveVotes,
        rejectVotes,
        abstainVotes: votes.filter(v => v.vote === ApprovalVoteType.ABSTAIN).length,
      },
    };
  }

  async disburseLoan(id: string, disburseDto: DisburseLoanDto, userId: string): Promise<Loan> {
    const loan = await this.findOne(id);

    if (loan.status !== LoanStatus.APPROVED) {
      throw new BadRequestException('Loan must be approved before disbursement');
    }

    // Check permission
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const userRole = user?.role as Role;
    if (!user || (userRole !== Role.TREASURER && userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN)) {
      throw new ForbiddenException('Only treasurer can disburse loans');
    }

    // Create payment record for disbursement
    await this.prisma.payment.create({
      data: {
        paymentNumber: `PAY-${Date.now()}`,
        loanId: id,
        amount: loan.amount,
        status: 'COMPLETED',
        method: disburseDto.paymentMethod,
        transactionRef: disburseDto.transactionRef,
        description: 'Loan disbursement',
        processedDate: new Date(),
      },
    });

    const updatedLoan = await this.prisma.loan.update({
      where: { id },
      data: {
        status: LoanStatus.DISBURSED,
        disbursementDate: new Date(),
      },
      include: {
        borrower: true,
      },
    });

    // Send disbursement email notification
    if (updatedLoan.borrower.email) {
      await this.emailService.sendLoanDisbursementEmail(
        updatedLoan.borrower.email,
        updatedLoan.borrower.firstName,
        updatedLoan.loanNumber,
        Number(updatedLoan.amount),
        disburseDto.paymentMethod,
      );
    }

    // Send real-time notification
    await this.notificationsService.createNotification({
      userId: updatedLoan.borrowerId,
      title: 'Prêt décaissé',
      message: `Les fonds de votre prêt ${updatedLoan.loanNumber} ont été décaissés`,
      type: 'loan_disbursed',
      metadata: { loanId: id },
    });

    return updatedLoan;
  }

  async getLoanStatistics(userId?: string, userRole?: Role) {
    // Check cache first
    const cacheKey = userId || 'global';
    const cachedStats = await this.cacheService.getCachedLoanStats(cacheKey);
    if (cachedStats) {
      return cachedStats;
    }

    const whereClause: Prisma.LoanWhereInput = {};
    
    if (userRole === Role.BORROWER && userId) {
      whereClause.borrowerId = userId;
    }

    const [
      totalLoans,
      activeLoans,
      completedLoans,
      defaultedLoans,
      totalDisbursed,
      totalRepaid,
      averageLoanAmount,
    ] = await Promise.all([
      this.prisma.loan.count({ where: whereClause }),
      this.prisma.loan.count({
        where: {
          ...whereClause,
          status: { in: [LoanStatus.ACTIVE, LoanStatus.DISBURSED] },
        },
      }),
      this.prisma.loan.count({
        where: {
          ...whereClause,
          status: LoanStatus.COMPLETED,
        },
      }),
      this.prisma.loan.count({
        where: {
          ...whereClause,
          status: LoanStatus.DEFAULTED,
        },
      }),
      this.prisma.loan.aggregate({
        where: {
          ...whereClause,
          status: { in: [LoanStatus.DISBURSED, LoanStatus.ACTIVE, LoanStatus.COMPLETED] },
        },
        _sum: { amount: true },
      }),
      this.prisma.loan.aggregate({
        where: whereClause,
        _sum: { totalRepaid: true },
      }),
      this.prisma.loan.count({
        where: whereClause,
      }).then(async (count) => {
        if (count === 0) return { _avg: { amount: 0 } };
        const sum = await this.prisma.loan.aggregate({
          where: whereClause,
          _sum: { amount: true },
        });
        return { _avg: { amount: Number(sum._sum.amount || 0) / count } };
      }),
    ]);

    const stats = {
      totalLoans,
      activeLoans,
      completedLoans,
      defaultedLoans,
      totalDisbursed: totalDisbursed._sum.amount || 0,
      totalRepaid: totalRepaid._sum.totalRepaid || 0,
      averageLoanAmount: averageLoanAmount._avg.amount || 0,
      repaymentRate: totalDisbursed._sum.amount 
        ? ((Number(totalRepaid._sum.totalRepaid) || 0) / Number(totalDisbursed._sum.amount) * 100).toFixed(2)
        : 0,
    };

    // Cache the statistics
    await this.cacheService.cacheLoanStats(cacheKey, stats);

    return stats;
  }

  private async generateLoanNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.loan.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    
    return `LOAN-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async createRepaymentSchedule(
    loanId: string,
    amount: number,
    numberOfInstallments: number,
    endDate: Date,
  ) {
    const installmentAmount = amount / numberOfInstallments;
    const today = new Date();
    const monthsDiff = (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const intervalDays = Math.floor((monthsDiff * 30) / numberOfInstallments);

    const schedules: {
      loanId: string;
      installmentNumber: number;
      dueDate: Date;
      amount: number;
      principalAmount: number;
    }[] = [];
    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + (intervalDays * i));

      schedules.push({
        loanId,
        installmentNumber: i,
        dueDate,
        amount: installmentAmount,
        principalAmount: installmentAmount,
      });
    }

    await this.prisma.repaymentSchedule.createMany({
      data: schedules,
    });
  }
}