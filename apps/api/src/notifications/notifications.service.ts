import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  // Get user notifications
  async getUserNotifications(userId: string, take = 20, skip = 0) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      notifications,
      unreadCount,
      total: await this.prisma.notification.count({ where: { userId } }),
    };
  }

  // Mark notifications as read
  async markAsRead(userId: string, notificationIds: string[]) {
    return this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: { isRead: true },
    });
  }

  // Mark all as read
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // Delete notification
  async deleteNotification(userId: string, notificationId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  // Create and send notification
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: any;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        message: data.message,
        metadata: data.metadata || {},
        isRead: false,
      },
    });

    // Send real-time notification
    await this.notificationsGateway.sendToUser(data.userId, 'notification:new', {
      ...notification,
      timestamp: new Date(),
    });

    return notification;
  }

  // Send loan update notification
  async notifyLoanUpdate(loanId: string, status: string, message?: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { borrower: true },
    });

    if (!loan) return;

    await this.createNotification({
      userId: loan.borrowerId,
      type: 'LOAN_UPDATE',
      title: 'Mise à jour de votre prêt',
      message: message || `Votre prêt ${loan.loanNumber} est maintenant: ${status}`,
      metadata: {
        loanId,
        loanNumber: loan.loanNumber,
        status,
      },
    });

    // Notify via WebSocket
    await this.notificationsGateway.notifyLoanStatusUpdate(loanId, status);
  }

  // Send vote notification
  async notifyNewVote(loanId: string, voterId: string, vote: string) {
    await this.notificationsGateway.notifyNewVote(loanId, vote, voterId);
  }

  // Send guarantee notification
  async notifyGuaranteeUpdate(guaranteeId: string, status: string) {
    await this.notificationsGateway.notifyGuaranteeUpdate(guaranteeId, status);
  }

  // Send system notification to all users
  async sendSystemNotification(title: string, message: string, role?: string) {
    if (role) {
      // Send to specific role
      const users = await this.prisma.user.findMany({
        where: { role: role as any },
        select: { id: true },
      });

      for (const user of users) {
        await this.createNotification({
          userId: user.id,
          type: 'SYSTEM',
          title,
          message,
        });
      }

      this.notificationsGateway.sendToRole(role, 'notification:system', {
        title,
        message,
        timestamp: new Date(),
      });
    } else {
      // Send to all users
      const users = await this.prisma.user.findMany({
        select: { id: true },
      });

      for (const user of users) {
        await this.createNotification({
          userId: user.id,
          type: 'SYSTEM',
          title,
          message,
        });
      }

      this.notificationsGateway.sendToAll('notification:system', {
        title,
        message,
        timestamp: new Date(),
      });
    }
  }
}