import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  getUserNotifications(
    @CurrentUser() user: User,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.notificationsService.getUserNotifications(
      user.id,
      take ? parseInt(take, 10) : 20,
      skip ? parseInt(skip, 10) : 0,
    );
  }

  @Patch('read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  markAsRead(
    @CurrentUser() user: User,
    @Body() body: { notificationIds: string[] },
  ) {
    return this.notificationsService.markAsRead(user.id, body.notificationIds);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllAsRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.deleteNotification(user.id, id);
  }

  @Post('test')
  @ApiOperation({ summary: 'Test notification (development only)' })
  @ApiResponse({ status: 201, description: 'Test notification sent' })
  async testNotification(@CurrentUser() user: User) {
    if (process.env.NODE_ENV !== 'development') {
      return { message: 'Only available in development' };
    }

    return this.notificationsService.createNotification({
      userId: user.id,
      type: 'TEST',
      title: 'Test Notification',
      message: 'This is a test notification from the API',
      metadata: {
        timestamp: new Date(),
        source: 'API Test Endpoint',
      },
    });
  }
}