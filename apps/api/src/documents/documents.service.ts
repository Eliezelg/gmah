import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createDocumentDto: CreateDocumentDto,
    file: Express.Multer.File,
    uploaderId: string,
  ) {
    // Generate checksum for file integrity
    const fileBuffer = await fs.readFile(file.path);
    const checksum = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    // Create document record
    const document = await this.prisma.document.create({
      data: {
        uploaderId,
        type: createDocumentDto.type,
        name: createDocumentDto.name,
        description: createDocumentDto.description,
        fileName: file.filename,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        path: file.path,
        fileUrl: `/uploads/documents/${file.filename}`,
        checksum,
        loanId: createDocumentDto.loanId,
        guaranteeId: createDocumentDto.guaranteeId,
        profileId: createDocumentDto.profileId,
      },
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        loan: true,
        guarantee: true,
      },
    });

    return document;
  }

  async findAll(userId: string, userRole: Role) {
    const whereClause: any = {};

    // Non-admin users can only see their own documents or documents related to their loans
    if (userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN) {
      whereClause.OR = [
        { uploaderId: userId },
        { loan: { borrowerId: userId } },
        { guarantee: { guarantorId: userId } },
      ];
    }

    return this.prisma.document.findMany({
      where: whereClause,
      include: {
        uploader: {
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
            borrowerId: true,
          },
        },
        guarantee: {
          select: {
            id: true,
            guarantorId: true,
          },
        },
        verifier: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string, userRole: Role) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        loan: true,
        guarantee: true,
        profile: true,
        verifier: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check access permissions
    const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;
    const isOwner = document.uploaderId === userId;
    const isRelatedToLoan = document.loan?.borrowerId === userId;
    const isRelatedToGuarantee = document.guarantee?.guarantorId === userId;

    if (!isAdmin && !isOwner && !isRelatedToLoan && !isRelatedToGuarantee) {
      throw new ForbiddenException('You do not have access to this document');
    }

    return document;
  }

  async findByLoan(loanId: string, userId: string, userRole: Role) {
    // Verify loan exists and user has access
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN || userRole === Role.COMMITTEE_MEMBER;
    if (!isAdmin && loan.borrowerId !== userId) {
      throw new ForbiddenException('You do not have access to these documents');
    }

    return this.prisma.document.findMany({
      where: { loanId },
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        verifier: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
    userId: string,
    userRole: Role,
  ) {
    const document = await this.findOne(id, userId, userRole);

    // Only admins can verify documents
    if (updateDocumentDto.isVerified !== undefined) {
      if (userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN) {
        throw new ForbiddenException('Only admins can verify documents');
      }
    }

    const updateData: any = {
      ...updateDocumentDto,
    };

    // If verifying, set verification details
    if (updateDocumentDto.isVerified === true) {
      updateData.verifiedBy = userId;
      updateData.verifiedAt = new Date();
    }

    return this.prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        verifier: {
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
    const document = await this.findOne(id, userId, userRole);

    // Only document owner or admin can delete
    const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;
    const isOwner = document.uploaderId === userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You cannot delete this document');
    }

    // Delete file from filesystem
    try {
      await fs.unlink(document.path);
    } catch (error) {
      console.error('Error deleting file:', error);
    }

    return this.prisma.document.delete({
      where: { id },
    });
  }

  async verifyChecksum(id: string): Promise<boolean> {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    try {
      const fileBuffer = await fs.readFile(document.path);
      const currentChecksum = crypto
        .createHash('sha256')
        .update(fileBuffer)
        .digest('hex');

      return currentChecksum === document.checksum;
    } catch (error) {
      console.error('Error verifying checksum:', error);
      return false;
    }
  }

  async getFileStream(id: string, userId: string, userRole: Role) {
    const document = await this.findOne(id, userId, userRole);
    
    try {
      const fileBuffer = await fs.readFile(document.path);
      return {
        buffer: fileBuffer,
        mimeType: document.mimeType,
        fileName: document.originalName,
      };
    } catch (error) {
      throw new NotFoundException('File not found on server');
    }
  }
}