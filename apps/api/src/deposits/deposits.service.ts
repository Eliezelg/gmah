import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DepositsService {
  constructor(private prisma: PrismaService) {}

  async getUserDeposits(userId: string) {
    return await this.prisma.deposit.findMany({
      where: {
        depositorId: userId,
        isActive: true,
        currentBalance: {
          gt: 0,
        },
      },
      orderBy: {
        depositDate: 'desc',
      },
    });
  }

  async findOne(id: string, userId?: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id },
      include: {
        depositor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        withdrawalRequests: {
          orderBy: {
            requestDate: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    // Check if user can access this deposit
    if (userId && deposit.depositorId !== userId) {
      // Allow admin/treasurer to view all deposits
      // For now, we'll allow access - in production, check user role
    }

    return deposit;
  }

  async createSampleDeposits(userId: string) {
    // This is a helper method to create sample deposits for testing
    const sampleDeposits = [
      {
        depositNumber: 'DEP-2024-000001',
        depositorId: userId,
        amount: new Decimal('50000'),
        currentBalance: new Decimal('45000'),
        currency: 'ILS',
        type: 'SAVINGS',
        description: 'Long-term savings deposit',
      },
      {
        depositNumber: 'DEP-2024-000002', 
        depositorId: userId,
        amount: new Decimal('25000'),
        currentBalance: new Decimal('25000'),
        currency: 'ILS',
        type: 'EMERGENCY_FUND',
        description: 'Emergency fund deposit',
      },
      {
        depositNumber: 'DEP-2024-000003',
        depositorId: userId,
        amount: new Decimal('100000'),
        currentBalance: new Decimal('80000'),
        currency: 'ILS',
        type: 'TERM',
        description: 'Term deposit - 12 months',
        maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      },
    ];

    // Check if user already has deposits
    const existingDeposits = await this.getUserDeposits(userId);
    if (existingDeposits.length > 0) {
      return existingDeposits;
    }

    // Create sample deposits
    const createdDeposits = await Promise.all(
      sampleDeposits.map(deposit =>
        this.prisma.deposit.create({
          data: deposit,
        })
      )
    );

    return createdDeposits;
  }
}