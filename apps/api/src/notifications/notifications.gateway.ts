import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationsGateway');
  private userSockets: Map<string, string[]> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      
      // Store user-socket mapping
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, []);
      }
      this.userSockets.get(userId)!.push(client.id);
      
      // Join user to their personal room
      client.join(`user:${userId}`);
      
      // Join role-based rooms
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      
      if (user) {
        client.join(`role:${user.role}`);
      }
      
      client.data.userId = userId;
      client.data.role = user?.role;
      
      this.logger.log(`Client connected: ${client.id}, User: ${userId}`);
      
      // Send pending notifications
      await this.sendPendingNotifications(userId, client);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    
    if (userId && this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId)!;
      const index = sockets.indexOf(client.id);
      if (index > -1) {
        sockets!.splice(index, 1);
      }
      
      if (sockets!.length === 0) {
        this.userSockets.delete(userId);
      }
    }
    
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Send notification to specific user
  async sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
    
    // Store in database for offline users
    await this.prisma.notification.create({
      data: {
        userId,
        type: event as any,
        title: data.title || 'Nouvelle notification',
        message: data.message,
        metadata: data.metadata || {},
        isRead: false,
      },
    });
  }

  // Send notification to role
  sendToRole(role: string, event: string, data: any) {
    this.server.to(`role:${role}`).emit(event, data);
  }

  // Send notification to all connected users
  sendToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Handle loan status updates
  async notifyLoanStatusUpdate(loanId: string, newStatus: string, userId?: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { borrower: true },
    });

    if (!loan) return;

    const notification = {
      type: 'LOAN_STATUS_UPDATE',
      title: 'Mise à jour du statut de prêt',
      message: `Le prêt ${loan.loanNumber} est maintenant ${newStatus}`,
      loanId,
      status: newStatus,
      timestamp: new Date(),
    };

    // Notify borrower
    await this.sendToUser(loan.borrowerId, 'loan:status', notification);

    // Notify committee members if status is UNDER_REVIEW
    if (newStatus === 'UNDER_REVIEW') {
      this.sendToRole('COMMITTEE_MEMBER', 'loan:review', {
        ...notification,
        message: `Nouveau prêt à examiner: ${loan.loanNumber}`,
      });
    }

    // Notify treasurer if status is APPROVED
    if (newStatus === 'APPROVED') {
      this.sendToRole('TREASURER', 'loan:approved', {
        ...notification,
        message: `Prêt ${loan.loanNumber} approuvé, en attente de décaissement`,
      });
    }
  }

  // Handle new vote notifications
  async notifyNewVote(loanId: string, vote: string, voterId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { 
        borrower: true,
        approvalVotes: true,
      },
    });

    if (!loan) return;

    const voter = await this.prisma.user.findUnique({
      where: { id: voterId },
      select: { firstName: true, lastName: true },
    });

    const notification = {
      type: 'NEW_VOTE',
      title: 'Nouveau vote sur le prêt',
      message: `${voter?.firstName} ${voter?.lastName} a voté ${vote} pour le prêt ${loan.loanNumber}`,
      loanId,
      vote,
      totalVotes: loan.approvalVotes.length,
      timestamp: new Date(),
    };

    // Notify all committee members
    this.sendToRole('COMMITTEE_MEMBER', 'vote:new', notification);

    // Notify borrower
    await this.sendToUser(loan.borrowerId, 'vote:update', {
      ...notification,
      message: `Un nouveau vote a été enregistré pour votre prêt ${loan.loanNumber}`,
    });
  }

  // Handle guarantee status updates
  async notifyGuaranteeUpdate(guaranteeId: string, status: string) {
    const guarantee = await this.prisma.guarantee.findUnique({
      where: { id: guaranteeId },
      include: { 
        loan: { include: { borrower: true } },
        guarantor: true,
      },
    });

    if (!guarantee) return;

    const notification = {
      type: 'GUARANTEE_UPDATE',
      title: 'Mise à jour de garantie',
      message: `La garantie pour le prêt ${guarantee.loan.loanNumber} a été ${status}`,
      guaranteeId,
      loanId: guarantee.loanId,
      status,
      timestamp: new Date(),
    };

    // Notify borrower
    await this.sendToUser(guarantee.loan.borrowerId, 'guarantee:update', notification);

    // Notify guarantor
    await this.sendToUser(guarantee.guarantorId, 'guarantee:update', {
      ...notification,
      message: `Votre garantie pour le prêt ${guarantee.loan.loanNumber} a été ${status}`,
    });
  }

  // Send pending notifications to newly connected user
  private async sendPendingNotifications(userId: string, client: Socket) {
    const unreadNotifications = await this.prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (unreadNotifications.length > 0) {
      client.emit('notifications:pending', unreadNotifications);
    }
  }

  // Mark notifications as read
  @SubscribeMessage('notifications:markRead')
  async handleMarkAsRead(
    @MessageBody() notificationIds: string[],
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    
    if (!userId) return;

    await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: { isRead: true },
    });

    client.emit('notifications:marked', { success: true, ids: notificationIds });
  }

  // Subscribe to loan updates
  @SubscribeMessage('loan:subscribe')
  handleLoanSubscribe(
    @MessageBody() loanId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`loan:${loanId}`);
    this.logger.log(`Client ${client.id} subscribed to loan ${loanId}`);
  }

  // Unsubscribe from loan updates
  @SubscribeMessage('loan:unsubscribe')
  handleLoanUnsubscribe(
    @MessageBody() loanId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`loan:${loanId}`);
    this.logger.log(`Client ${client.id} unsubscribed from loan ${loanId}`);
  }
}