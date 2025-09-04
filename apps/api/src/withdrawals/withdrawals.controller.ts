import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { UpdateWithdrawalRequestDto } from './dto/update-withdrawal-request.dto';
import { ApproveWithdrawalRequestDto, RejectWithdrawalRequestDto } from './dto/approve-withdrawal-request.dto';
import { WithdrawalQueryDto } from './dto/withdrawal-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('withdrawals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Create a new withdrawal request' })
  @ApiResponse({ 
    status: 201, 
    description: 'Withdrawal request created successfully',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - validation failed or insufficient balance',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Deposit not found',
  })
  async create(
    @Body() createWithdrawalDto: CreateWithdrawalRequestDto,
    @Req() req: any,
  ) {
    return await this.withdrawalsService.create(createWithdrawalDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all withdrawal requests with filtering and pagination' })
  @ApiResponse({ 
    status: 200, 
    description: 'Withdrawal requests retrieved successfully',
  })
  async findAll(
    @Query() query: WithdrawalQueryDto,
    @Req() req: any,
  ) {
    return await this.withdrawalsService.findAll(query, req.user.id, req.user.role);
  }

  @Get('impact')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get treasury impact of withdrawal requests' })
  @ApiResponse({ 
    status: 200, 
    description: 'Treasury impact data retrieved successfully',
  })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  async getTreasuryImpact(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return await this.withdrawalsService.getTreasuryImpact({ fromDate, toDate });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific withdrawal request by ID' })
  @ApiParam({ name: 'id', description: 'Withdrawal request ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Withdrawal request retrieved successfully',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Withdrawal request not found',
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Access denied',
  })
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return await this.withdrawalsService.findOne(id, req.user.id, req.user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a withdrawal request' })
  @ApiParam({ name: 'id', description: 'Withdrawal request ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Withdrawal request updated successfully',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Cannot update non-pending request',
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Can only update your own requests',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Withdrawal request not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateWithdrawalDto: UpdateWithdrawalRequestDto,
    @Req() req: any,
  ) {
    return await this.withdrawalsService.update(id, updateWithdrawalDto, req.user.id);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER, Role.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Approve a withdrawal request' })
  @ApiParam({ name: 'id', description: 'Withdrawal request ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Withdrawal request approved successfully',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Cannot approve non-pending request or insufficient balance',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Withdrawal request not found',
  })
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveWithdrawalRequestDto,
    @Req() req: any,
  ) {
    return await this.withdrawalsService.approve(id, approveDto, req.user.id);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER, Role.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Reject a withdrawal request' })
  @ApiParam({ name: 'id', description: 'Withdrawal request ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Withdrawal request rejected successfully',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Cannot reject non-pending request',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Withdrawal request not found',
  })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectWithdrawalRequestDto,
    @Req() req: any,
  ) {
    return await this.withdrawalsService.reject(id, rejectDto, req.user.id);
  }

  @Post(':id/execute')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER)
  @ApiOperation({ summary: 'Execute an approved withdrawal request' })
  @ApiParam({ name: 'id', description: 'Withdrawal request ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Withdrawal request execution started successfully',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Can only execute approved requests',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Withdrawal request not found',
  })
  @HttpCode(HttpStatus.OK)
  async execute(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return await this.withdrawalsService.execute(id, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a withdrawal request (admin only)' })
  @ApiParam({ name: 'id', description: 'Withdrawal request ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Withdrawal request deleted successfully',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Withdrawal request not found',
  })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    // Only allow deletion of pending or rejected requests
    const request = await this.withdrawalsService.findOne(id);
    
    if (request.status !== 'PENDING' && request.status !== 'REJECTED') {
      throw new Error('Can only delete pending or rejected withdrawal requests');
    }

    // This would be implemented in the service
    // return await this.withdrawalsService.remove(id);
    
    return { message: 'Withdrawal request deletion not yet implemented' };
  }
}