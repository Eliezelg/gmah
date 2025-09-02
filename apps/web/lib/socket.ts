import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './auth';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = getAuthToken();
    if (!token) {
      console.warn('No auth token available for WebSocket connection');
      return null;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
    this.socket = io(`${baseUrl}/notifications`, {
      transports: ['websocket', 'polling'],
      auth: {
        token,
      },
    });

    this.setupEventHandlers();
    return this.socket;
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.emit('connected', true);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.emit('connected', false);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    // Notification events
    this.socket.on('notification:new', (data) => {
      this.emit('notification:new', data);
    });

    this.socket.on('notifications:pending', (data) => {
      this.emit('notifications:pending', data);
    });

    this.socket.on('notifications:marked', (data) => {
      this.emit('notifications:marked', data);
    });

    // Loan events
    this.socket.on('loan:status', (data) => {
      this.emit('loan:status', data);
    });

    this.socket.on('loan:review', (data) => {
      this.emit('loan:review', data);
    });

    this.socket.on('loan:approved', (data) => {
      this.emit('loan:approved', data);
    });

    // Vote events
    this.socket.on('vote:new', (data) => {
      this.emit('vote:new', data);
    });

    this.socket.on('vote:update', (data) => {
      this.emit('vote:update', data);
    });

    // Guarantee events
    this.socket.on('guarantee:update', (data) => {
      this.emit('guarantee:update', data);
    });

    // System events
    this.socket.on('notification:system', (data) => {
      this.emit('notification:system', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => listener(data));
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    };
  }

  off(event: string, callback?: Function) {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    }
  }

  // Socket.io specific methods
  subscribeLoan(loanId: string) {
    this.socket?.emit('loan:subscribe', loanId);
  }

  unsubscribeLoan(loanId: string) {
    this.socket?.emit('loan:unsubscribe', loanId);
  }

  markNotificationsRead(notificationIds: string[]) {
    this.socket?.emit('notifications:markRead', notificationIds);
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;