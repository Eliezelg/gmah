import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DepositsService } from './deposits.service';

@ApiTags('deposits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Get('my-deposits')
  @ApiOperation({ summary: 'Get current user deposits available for withdrawal' })
  @ApiResponse({ status: 200, description: 'User deposits retrieved successfully' })
  async getMyDeposits(@Req() req: any) {
    return await this.depositsService.getUserDeposits(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deposit by ID' })
  @ApiResponse({ status: 200, description: 'Deposit retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Deposit not found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return await this.depositsService.findOne(id, req.user.id);
  }
}