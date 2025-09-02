import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { SubmitLoanDto } from './dto/submit-loan.dto';
import { ApproveLoanDto } from './dto/approve-loan.dto';
import { VoteLoanDto } from './dto/vote-loan.dto';
import { DisburseLoanDto } from './dto/disburse-loan.dto';
import { RejectLoanDto } from './dto/reject-loan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, LoanStatus, LoanType } from '@prisma/client';
import type { User } from '@prisma/client';

@ApiTags('Loans')
@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new loan request' })
  @ApiResponse({ status: 201, description: 'Loan created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createLoanDto: CreateLoanDto, @CurrentUser() user: User) {
    return this.loansService.create(createLoanDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all loans' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: LoanStatus })
  @ApiQuery({ name: 'type', required: false, enum: LoanType })
  @ApiResponse({ status: 200, description: 'Loans retrieved successfully' })
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('status') status?: LoanStatus,
    @Query('type') type?: LoanType,
    @CurrentUser() user?: User,
  ) {
    return this.loansService.findAll({
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      where: {
        ...(status && { status }),
        ...(type && { type }),
      },
      userRole: user?.role,
      userId: user?.id,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get loan statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics(@CurrentUser() user: User) {
    return this.loansService.getLoanStatistics(user?.id, user?.role);
  }

  @Get('my-loans')
  @ApiOperation({ summary: 'Get current user loans' })
  @ApiResponse({ status: 200, description: 'User loans retrieved successfully' })
  getMyLoans(@CurrentUser() user: User) {
    return this.loansService.findAll({
      where: { borrowerId: user?.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loan by ID' })
  @ApiResponse({ status: 200, description: 'Loan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  findOne(@Param('id') id: string) {
    return this.loansService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update loan (only in DRAFT status)' })
  @ApiResponse({ status: 200, description: 'Loan updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id') id: string,
    @Body() updateLoanDto: UpdateLoanDto,
    @CurrentUser() user: User,
  ) {
    return this.loansService.update(id, updateLoanDto, user?.id, user?.role);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit loan for approval' })
  @ApiResponse({ status: 200, description: 'Loan submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid loan status' })
  submitForApproval(
    @Param('id') id: string,
    @Body() submitDto: SubmitLoanDto,
    @CurrentUser() user: User,
  ) {
    return this.loansService.submitForApproval(id, submitDto, user?.id);
  }

  @Post(':id/start-review')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMMITTEE_MEMBER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start loan review process' })
  @ApiResponse({ status: 200, description: 'Review started successfully' })
  async startReview(@Param('id') id: string) {
    return this.loansService.update(
      id,
      { status: LoanStatus.UNDER_REVIEW },
      '', // System action
      Role.ADMIN,
    );
  }

  @Post(':id/vote')
  @Roles(Role.COMMITTEE_MEMBER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vote on loan approval' })
  @ApiResponse({ status: 200, description: 'Vote recorded successfully' })
  @ApiResponse({ status: 400, description: 'Already voted or invalid status' })
  voteLoan(
    @Param('id') id: string,
    @Body() voteDto: VoteLoanDto,
    @CurrentUser() user: User,
  ) {
    return this.loansService.voteLoan(id, voteDto, user.id);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve loan' })
  @ApiResponse({ status: 200, description: 'Loan approved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid loan status' })
  approveLoan(
    @Param('id') id: string,
    @Body() approveDto: ApproveLoanDto,
    @CurrentUser() user: User,
  ) {
    return this.loansService.approveLoan(id, approveDto, user.id);
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER, Role.COMMITTEE_MEMBER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject loan' })
  @ApiResponse({ status: 200, description: 'Loan rejected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid loan status' })
  rejectLoan(
    @Param('id') id: string,
    @Body() rejectDto: RejectLoanDto,
    @CurrentUser() user: User,
  ) {
    return this.loansService.rejectLoan(id, rejectDto.reason, user.id);
  }

  @Post(':id/disburse')
  @Roles(Role.TREASURER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disburse approved loan' })
  @ApiResponse({ status: 200, description: 'Loan disbursed successfully' })
  @ApiResponse({ status: 400, description: 'Loan not approved' })
  disburseLoan(
    @Param('id') id: string,
    @Body() disburseDto: DisburseLoanDto,
    @CurrentUser() user: User,
  ) {
    return this.loansService.disburseLoan(id, disburseDto, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel loan (only DRAFT or SUBMITTED)' })
  @ApiResponse({ status: 200, description: 'Loan cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel loan in current status' })
  async cancelLoan(@Param('id') id: string, @CurrentUser() user: User) {
    const loan = await this.loansService.findOne(id);
    
    // Only borrower can cancel their own loan, or admin
    const userRole = user?.role as Role;
    const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;
    if (loan.borrowerId !== user?.id && !isAdmin) {
      throw new BadRequestException('You can only cancel your own loans');
    }

    const loanStatus = loan.status as LoanStatus;
    if (loanStatus !== LoanStatus.DRAFT && loanStatus !== LoanStatus.SUBMITTED) {
      throw new BadRequestException('Loan can only be cancelled in DRAFT or SUBMITTED status');
    }

    return this.loansService.update(
      id,
      { status: LoanStatus.CANCELLED },
      user?.id,
      user?.role,
    );
  }

  @Post(':id/direct-approve')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Direct approval by single decision maker (no committee)' })
  @ApiResponse({ status: 200, description: 'Loan approved directly' })
  @ApiResponse({ status: 400, description: 'Invalid loan status' })
  @ApiResponse({ status: 403, description: 'Only admins can directly approve' })
  async directApprove(
    @Param('id') id: string,
    @Body() approveDto: { comments?: string; conditions?: string },
    @CurrentUser() user: User,
  ) {
    const loan = await this.loansService.findOne(id);
    
    const loanStatus = loan.status as LoanStatus;
    if (loanStatus !== LoanStatus.SUBMITTED && loanStatus !== LoanStatus.UNDER_REVIEW) {
      throw new BadRequestException('Loan must be in SUBMITTED or UNDER_REVIEW status');
    }

    // Update loan status to APPROVED with single approver details
    return this.loansService.update(
      id,
      { 
        status: LoanStatus.APPROVED,
        approvedBy: user.id,
        approvalDate: new Date(),
        approvalComments: approveDto.comments,
        approvalConditions: approveDto.conditions,
      },
      user?.id,
      user?.role,
    );
  }

  @Post(':id/direct-reject')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Direct rejection by single decision maker (no committee)' })
  @ApiResponse({ status: 200, description: 'Loan rejected directly' })
  @ApiResponse({ status: 400, description: 'Invalid loan status' })
  @ApiResponse({ status: 403, description: 'Only admins can directly reject' })
  async directReject(
    @Param('id') id: string,
    @Body() rejectDto: { reason: string; comments?: string },
    @CurrentUser() user: User,
  ) {
    const loan = await this.loansService.findOne(id);
    
    const loanStatus = loan.status as LoanStatus;
    if (loanStatus !== LoanStatus.SUBMITTED && loanStatus !== LoanStatus.UNDER_REVIEW) {
      throw new BadRequestException('Loan must be in SUBMITTED or UNDER_REVIEW status');
    }

    // Update loan status to REJECTED with rejection details
    return this.loansService.update(
      id,
      { 
        status: LoanStatus.REJECTED,
        rejectedBy: user.id,
        rejectionDate: new Date(),
        rejectionReason: rejectDto.reason,
        rejectionComments: rejectDto.comments,
      },
      user?.id,
      user?.role,
    );
  }
}