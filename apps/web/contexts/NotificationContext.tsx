'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import socketService from '@/lib/socket';
import { toast } from 'sonner';
import { Bell, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationIds: string[]) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [isAuthenticated]);

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const socket = socketService.connect();
      
      if (socket) {
        // Listen for connection status
        const unsubConnected = socketService.on('connected', (connected: boolean) => {
          setIsConnected(connected);
          if (connected) {
            fetchNotifications();
          }
        });

        // Listen for new notifications
        const unsubNew = socketService.on('notification:new', (notification: Notification) => {
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification
          const icon = getNotificationIcon(notification.type);
          toast(notification.title, {
            description: notification.message,
            icon,
          });
        });

        // Listen for pending notifications
        const unsubPending = socketService.on('notifications:pending', (pendingNotifications: Notification[]) => {
          setNotifications(prev => [...pendingNotifications, ...prev]);
          const unread = pendingNotifications.filter(n => !n.isRead).length;
          setUnreadCount(prev => prev + unread);
        });

        // Listen for marked notifications
        const unsubMarked = socketService.on('notifications:marked', (data: { success: boolean; ids: string[] }) => {
          if (data.success) {
            setNotifications(prev => 
              prev.map(n => 
                data.ids.includes(n.id) ? { ...n, isRead: true } : n
              )
            );
            setUnreadCount(prev => Math.max(0, prev - data.ids.length));
          }
        });

        // Listen for system notifications
        const unsubSystem = socketService.on('notification:system', (data: any) => {
          toast.info(data.title, {
            description: data.message,
          });
        });

        // Cleanup
        return () => {
          unsubConnected();
          unsubNew();
          unsubPending();
          unsubMarked();
          unsubSystem();
          socketService.disconnect();
        };
      }
    }
  }, [isAuthenticated, user, fetchNotifications]);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ notificationIds }),
      });

      if (response.ok) {
        socketService.markNotificationsRead(notificationIds);
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Delete a notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        const notification = notifications.find(n => n.id === id);
        if (notification && !notification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, [notifications]);

  const value = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications: fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Helper function to get icon for notification type
function getNotificationIcon(type: string) {
  switch (type) {
    case 'LOAN_APPROVED':
    case 'LOAN_DISBURSED':
    case 'LOAN_COMPLETED':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'LOAN_REJECTED':
    case 'LOAN_DEFAULTED':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Info className="h-4 w-4 text-blue-600" />;
  }
}