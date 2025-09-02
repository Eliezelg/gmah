import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  Query,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a new document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        type: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        loanId: { type: 'string' },
        guaranteeId: { type: 'string' },
        profileId: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/documents',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type'), false);
        }
      },
    }),
  )
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.documentsService.create(createDocumentDto, file, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents accessible to user' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  findAll(@CurrentUser() user: User) {
    return this.documentsService.findAll(user.id, user.role);
  }

  @Get('loan/:loanId')
  @ApiOperation({ summary: 'Get all documents for a specific loan' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  findByLoan(@Param('loanId') loanId: string, @CurrentUser() user: User) {
    return this.documentsService.findByLoan(loanId, user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.documentsService.findOne(id, user.id, user.role);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download document file' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Document or file not found' })
  async download(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const fileData = await this.documentsService.getFileStream(
      id,
      user.id,
      user.role,
    );

    res.set({
      'Content-Type': fileData.mimeType,
      'Content-Disposition': `attachment; filename="${fileData.fileName}"`,
    });

    res.send(fileData.buffer);
  }

  @Get(':id/verify-integrity')
  @ApiOperation({ summary: 'Verify document file integrity' })
  @ApiResponse({ status: 200, description: 'Integrity check result' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async verifyIntegrity(@Param('id') id: string) {
    const isValid = await this.documentsService.verifyChecksum(id);
    return { documentId: id, integrityValid: isValid };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document metadata' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.update(
      id,
      updateDocumentDto,
      user.id,
      user.role,
    );
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verify a document' })
  @ApiResponse({ status: 200, description: 'Document verified successfully' })
  @ApiResponse({ status: 403, description: 'Only admins can verify' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  verify(
    @Param('id') id: string,
    @Body() body: { verificationNotes?: string },
    @CurrentUser() user: User,
  ) {
    return this.documentsService.update(
      id,
      {
        isVerified: true,
        verificationNotes: body.verificationNotes,
      },
      user.id,
      user.role,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.documentsService.remove(id, user.id, user.role);
  }
}