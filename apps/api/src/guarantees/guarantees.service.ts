import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuaranteeDto } from './dto/create-guarantee.dto';
import { UpdateGuaranteeDto } from './dto/update-guarantee.dto';
import { SignGuaranteeDto } from './dto/sign-guarantee.dto';
import { Role, GuaranteeStatus, LoanStatus } from '@prisma/client';

@Injectable()
export class GuaranteesService {
  constructor(private prisma: PrismaService) {}

  async create(createGuaranteeDto: CreateGuaranteeDto, requesterId: string) {
    // Verify loan exists and is in appropriate status
    const loan = await this.prisma.loan.findUnique({
      where: { id: createGuaranteeDto.loanId },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    const loanStatus = loan.status as LoanStatus;
    if (loanStatus !== LoanStatus.DRAFT && loanStatus !== LoanStatus.SUBMITTED) {
      throw new BadRequestException(
        'Guarantees can only be added to loans in DRAFT or SUBMITTED status',
      );
    }

    // Check if guarantor exists
    const guarantor = await this.prisma.user.findUnique({
      where: { id: createGuaranteeDto.guarantorId },
    });

    if (!guarantor) {
      throw new NotFoundException('Guarantor not found');
    }

    // Check if guarantor already has a guarantee for this loan
    const existingGuarantee = await this.prisma.guarantee.findUnique({
      where: {
        loanId_guarantorId: {
          loanId: createGuaranteeDto.loanId,
          guarantorId: createGuaranteeDto.guarantorId,
        },
      },
    });

    if (existingGuarantee) {
      throw new BadRequestException(
        'Guarantor already has a guarantee for this loan',
      );
    }

    // Create guarantee
    const guarantee = await this.prisma.guarantee.create({
      data: {
        ...createGuaranteeDto,
        status: GuaranteeStatus.PENDING,
      },
      include: {
        guarantor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        loan: {
          select: {
            id: true,
            loanNumber: true,
            amount: true,
            borrowerId: true,
            borrower: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // TODO: Send notification to guarantor

    return guarantee;
  }

  async findAll(userId: string, userRole: Role) {
    const whereClause: any = {};

    // Filter based on user role
    if (userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN) {
      whereClause.OR = [
        { guarantorId: userId },
        { loan: { borrowerId: userId } },
      ];
    }

    return this.prisma.guarantee.findMany({
      where: whereClause,
      include: {
        guarantor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        loan: {
          select: {
            id: true,
            loanNumber: true,
            amount: true,
            status: true,
            borrower: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            name: true,
            isVerified: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByLoan(loanId: string, userId: string, userRole: Role) {
    // Verify loan exists
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    // Check access permissions
    const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN || userRole === Role.COMMITTEE_MEMBER;
    if (!isAdmin && loan.borrowerId !== userId) {
      throw new ForbiddenException('You do not have access to these guarantees');
    }

    return this.prisma.guarantee.findMany({
      where: { loanId },
      include: {
        guarantor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            name: true,
            isVerified: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string, userRole: Role) {
    const guarantee = await this.prisma.guarantee.findUnique({
      where: { id },
      include: {
        guarantor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            address: true,
          },
        },
        loan: {
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
        },
        documents: true,
      },
    });

    if (!guarantee) {
      throw new NotFoundException('Guarantee not found');
    }

    // Check access permissions
    const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;
    const isGuarantor = guarantee.guarantorId === userId;
    const isBorrower = guarantee.loan.borrowerId === userId;
    const isCommittee = userRole === Role.COMMITTEE_MEMBER;

    if (!isAdmin && !isGuarantor && !isBorrower && !isCommittee) {
      throw new ForbiddenException('You do not have access to this guarantee');
    }

    return guarantee;
  }

  async update(
    id: string,
    updateGuaranteeDto: UpdateGuaranteeDto,
    userId: string,
    userRole: Role,
  ) {
    const guarantee = await this.findOne(id, userId, userRole);

    // Only admins can update guarantee details
    if (userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can update guarantees');
    }

    // Can't update if guarantee is already active or invoked
    const guaranteeStatus = guarantee.status as GuaranteeStatus;
    if (guaranteeStatus === GuaranteeStatus.ACTIVE || guaranteeStatus === GuaranteeStatus.INVOKED) {
      throw new BadRequestException(
        'Cannot update guarantee that is active or invoked',
      );
    }

    return this.prisma.guarantee.update({
      where: { id },
      data: updateGuaranteeDto,
      include: {
        guarantor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        loan: {
          select: {
            id: true,
            loanNumber: true,
            amount: true,
          },
        },
      },
    });
  }

  async sign(id: string, signDto: SignGuaranteeDto, userId: string) {
    const guarantee = await this.prisma.guarantee.findUnique({
      where: { id },
      include: {
        loan: true,
      },
    });

    if (!guarantee) {
      throw new NotFoundException('Guarantee not found');
    }

    // Only guarantor can sign their own guarantee
    if (guarantee.guarantorId !== userId) {
      throw new ForbiddenException('You can only sign your own guarantee');
    }

    // Can only sign pending guarantees
    if (guarantee.status !== GuaranteeStatus.PENDING) {
      throw new BadRequestException('Can only sign pending guarantees');
    }

    // Update guarantee with signature
    const signedGuarantee = await this.prisma.guarantee.update({
      where: { id },
      data: {
        status: GuaranteeStatus.ACTIVE,
        signedDate: new Date(),
        activatedDate: new Date(),
        signatureHash: signDto.signatureHash,
        signatureIp: signDto.signatureIp,
      },
      include: {
        guarantor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        loan: {
          select: {
            id: true,
            loanNumber: true,
            borrower: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // TODO: Send notification to borrower that guarantee has been signed

    return signedGuarantee;
  }

  async release(id: string, userId: string, userRole: Role) {
    const guarantee = await this.findOne(id, userId, userRole);

    // Only admins or treasurer can release guarantees
    if (userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN && userRole !== Role.TREASURER) {
      throw new ForbiddenException('Only admins or treasurer can release guarantees');
    }

    // Can only release active guarantees when loan is completed
    if (guarantee.status !== GuaranteeStatus.ACTIVE) {
      throw new BadRequestException('Can only release active guarantees');
    }

    const loanStatus = guarantee.loan.status as LoanStatus;
    if (loanStatus !== LoanStatus.COMPLETED) {
      throw new BadRequestException(
        'Guarantee can only be released when loan is completed',
      );
    }

    return this.prisma.guarantee.update({
      where: { id },
      data: {
        status: GuaranteeStatus.RELEASED,
        releasedDate: new Date(),
      },
      include: {
        guarantor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async cancel(id: string, userId: string, userRole: Role) {
    const guarantee = await this.findOne(id, userId, userRole);

    // Check permissions
    const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;
    const isGuarantor = guarantee.guarantorId === userId;
    const isBorrower = guarantee.loan.borrowerId === userId;

    if (!isAdmin && !isGuarantor && !isBorrower) {
      throw new ForbiddenException('You cannot cancel this guarantee');
    }

    // Can only cancel pending guarantees
    if (guarantee.status !== GuaranteeStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending guarantees');
    }

    return this.prisma.guarantee.update({
      where: { id },
      data: {
        status: GuaranteeStatus.CANCELLED,
      },
    });
  }

  async invoke(id: string, userId: string, userRole: Role) {
    const guarantee = await this.findOne(id, userId, userRole);

    // Only admins or treasurer can invoke guarantees
    if (userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN && userRole !== Role.TREASURER) {
      throw new ForbiddenException('Only admins or treasurer can invoke guarantees');
    }

    // Can only invoke active guarantees
    if (guarantee.status !== GuaranteeStatus.ACTIVE) {
      throw new BadRequestException('Can only invoke active guarantees');
    }

    // Check if loan is defaulted
    const loanStatus = guarantee.loan.status as LoanStatus;
    if (loanStatus !== LoanStatus.DEFAULTED) {
      throw new BadRequestException(
        'Guarantee can only be invoked for defaulted loans',
      );
    }

    return this.prisma.guarantee.update({
      where: { id },
      data: {
        status: GuaranteeStatus.INVOKED,
      },
      include: {
        guarantor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string, userRole: Role) {
    const guarantee = await this.findOne(id, userId, userRole);

    // Only admins can delete guarantees
    if (userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can delete guarantees');
    }

    // Can only delete pending guarantees
    if (guarantee.status !== GuaranteeStatus.PENDING) {
      throw new BadRequestException('Can only delete pending guarantees');
    }

    return this.prisma.guarantee.delete({
      where: { id },
    });
  }

  async getGuarantorStats(guarantorId: string) {
    const [totalGuarantees, activeGuarantees, totalAmount] = await Promise.all([
      this.prisma.guarantee.count({
        where: { guarantorId },
      }),
      this.prisma.guarantee.count({
        where: {
          guarantorId,
          status: GuaranteeStatus.ACTIVE,
        },
      }),
      this.prisma.guarantee.aggregate({
        where: {
          guarantorId,
          status: GuaranteeStatus.ACTIVE,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      totalGuarantees,
      activeGuarantees,
      totalAmountGuaranteed: totalAmount._sum.amount || 0,
    };
  }
}