import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        passwordHash: hashedPassword,
        password: undefined,
      } as any,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return null;
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    if (updateUserDto.password) {
      updateUserDto['passwordHash'] = await bcrypt.hash(updateUserDto.password, 10);
      delete updateUserDto.password;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto as any,
    });
  }

  async remove(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getUserWithProfile(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        borrowedLoans: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        guarantees: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        contributions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserStats(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [
      totalLoans,
      activeLoans,
      totalBorrowed,
      totalRepaid,
      totalGuarantees,
      activeGuarantees,
      totalContributions,
    ] = await Promise.all([
      this.prisma.loan.count({ where: { borrowerId: id } }),
      this.prisma.loan.count({
        where: {
          borrowerId: id,
          status: { in: ['ACTIVE', 'DISBURSED'] },
        },
      }),
      this.prisma.loan.aggregate({
        where: { borrowerId: id },
        _sum: { amount: true },
      }),
      this.prisma.loan.aggregate({
        where: { borrowerId: id },
        _sum: { totalRepaid: true },
      }),
      this.prisma.guarantee.count({ where: { guarantorId: id } }),
      this.prisma.guarantee.count({
        where: {
          guarantorId: id,
          status: 'ACTIVE',
        },
      }),
      this.prisma.contribution.aggregate({
        where: { contributorId: id },
        _sum: { amount: true },
      }),
    ]);

    return {
      loans: {
        total: totalLoans,
        active: activeLoans,
        totalBorrowed: totalBorrowed._sum.amount || 0,
        totalRepaid: totalRepaid._sum.totalRepaid || 0,
      },
      guarantees: {
        total: totalGuarantees,
        active: activeGuarantees,
      },
      contributions: {
        total: totalContributions._sum.amount || 0,
      },
    };
  }
}