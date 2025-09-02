import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { GuaranteesService } from './guarantees.service';
import { CreateGuaranteeDto } from './dto/create-guarantee.dto';
import { UpdateGuaranteeDto } from './dto/update-guarantee.dto';
import { SignGuaranteeDto } from './dto/sign-guarantee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import type { Request } from 'express';

@ApiTags('Guarantees')
@ApiBearerAuth()
@Controller('guarantees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuaranteesController {
  constructor(private readonly guaranteesService: GuaranteesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new guarantee' })
  @ApiResponse({ status: 201, description: 'Guarantee created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Loan or guarantor not found' })
  create(
    @Body() createGuaranteeDto: CreateGuaranteeDto,
    @CurrentUser() user: User,
  ) {
    return this.guaranteesService.create(createGuaranteeDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all guarantees accessible to user' })
  @ApiResponse({ status: 200, description: 'Guarantees retrieved successfully' })
  findAll(@CurrentUser() user: User) {
    return this.guaranteesService.findAll(user.id, user.role);
  }

  @Get('guarantor/:guarantorId/stats')
  @ApiOperation({ summary: 'Get guarantor statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getGuarantorStats(
    @Param('guarantorId') guarantorId: string,
    @CurrentUser() user: User,
  ) {
    // Users can only see their own stats, admins can see all
    const userRole = user.role as Role;
    const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;
    if (!isAdmin && guarantorId !== user.id) {
      guarantorId = user.id;
    }
    return this.guaranteesService.getGuarantorStats(guarantorId);
  }

  @Get('loan/:loanId')
  @ApiOperation({ summary: 'Get all guarantees for a specific loan' })
  @ApiResponse({ status: 200, description: 'Guarantees retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  findByLoan(@Param('loanId') loanId: string, @CurrentUser() user: User) {
    return this.guaranteesService.findByLoan(loanId, user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guarantee by ID' })
  @ApiResponse({ status: 200, description: 'Guarantee retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Guarantee not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.guaranteesService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update guarantee details' })
  @ApiResponse({ status: 200, description: 'Guarantee updated successfully' })
  @ApiResponse({ status: 403, description: 'Only admins can update' })
  @ApiResponse({ status: 404, description: 'Guarantee not found' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateGuaranteeDto: UpdateGuaranteeDto,
    @CurrentUser() user: User,
  ) {
    return this.guaranteesService.update(
      id,
      updateGuaranteeDto,
      user.id,
      user.role,
    );
  }

  @Post(':id/sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign a guarantee electronically' })
  @ApiResponse({ status: 200, description: 'Guarantee signed successfully' })
  @ApiResponse({ status: 400, description: 'Can only sign pending guarantees' })
  @ApiResponse({ status: 403, description: 'Can only sign your own guarantee' })
  @ApiResponse({ status: 404, description: 'Guarantee not found' })
  async sign(
    @Param('id') id: string,
    @Body() signDto: SignGuaranteeDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    // Get real IP address
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    return this.guaranteesService.sign(
      id,
      {
        ...signDto,
        signatureIp: ip,
      },
      user.id,
    );
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release a guarantee after loan completion' })
  @ApiResponse({ status: 200, description: 'Guarantee released successfully' })
  @ApiResponse({ status: 400, description: 'Invalid guarantee status or loan not completed' })
  @ApiResponse({ status: 403, description: 'Only admins or treasurer can release' })
  @ApiResponse({ status: 404, description: 'Guarantee not found' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER)
  release(@Param('id') id: string, @CurrentUser() user: User) {
    return this.guaranteesService.release(id, user.id, user.role);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending guarantee' })
  @ApiResponse({ status: 200, description: 'Guarantee cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Can only cancel pending guarantees' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Guarantee not found' })
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.guaranteesService.cancel(id, user.id, user.role);
  }

  @Post(':id/invoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invoke a guarantee for defaulted loan' })
  @ApiResponse({ status: 200, description: 'Guarantee invoked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid guarantee status or loan not defaulted' })
  @ApiResponse({ status: 403, description: 'Only admins or treasurer can invoke' })
  @ApiResponse({ status: 404, description: 'Guarantee not found' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER)
  invoke(@Param('id') id: string, @CurrentUser() user: User) {
    return this.guaranteesService.invoke(id, user.id, user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a pending guarantee' })
  @ApiResponse({ status: 200, description: 'Guarantee deleted successfully' })
  @ApiResponse({ status: 400, description: 'Can only delete pending guarantees' })
  @ApiResponse({ status: 403, description: 'Only admins can delete' })
  @ApiResponse({ status: 404, description: 'Guarantee not found' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.guaranteesService.remove(id, user.id, user.role);
  }
}