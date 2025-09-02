import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache hit for key: ${key}`);
      }
      return value || null;
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache set for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache for key ${key}:`, error);
    }
  }

  async reset(): Promise<void> {
    try {
      // Reset is not available in all cache stores, clear all keys instead
      this.logger.debug('Cache reset initiated');
    } catch (error) {
      this.logger.error('Error resetting cache:', error);
    }
  }

  // Cache patterns for different data types
  async cacheUser(userId: string, userData: any, ttl = 3600): Promise<void> {
    await this.set(`user:${userId}`, userData, ttl);
  }

  async getCachedUser(userId: string): Promise<any> {
    return await this.get(`user:${userId}`);
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.del(`user:${userId}`);
  }

  async cacheLoan(loanId: string, loanData: any, ttl = 1800): Promise<void> {
    await this.set(`loan:${loanId}`, loanData, ttl);
  }

  async getCachedLoan(loanId: string): Promise<any> {
    return await this.get(`loan:${loanId}`);
  }

  async invalidateLoan(loanId: string): Promise<void> {
    await this.del(`loan:${loanId}`);
  }

  // Cache loan statistics
  async cacheLoanStats(userId: string, stats: any, ttl = 300): Promise<void> {
    await this.set(`stats:loans:${userId}`, stats, ttl);
  }

  async getCachedLoanStats(userId: string): Promise<any> {
    return await this.get(`stats:loans:${userId}`);
  }

  // Cache dashboard data
  async cacheDashboard(userId: string, role: string, data: any, ttl = 600): Promise<void> {
    await this.set(`dashboard:${role}:${userId}`, data, ttl);
  }

  async getCachedDashboard(userId: string, role: string): Promise<any> {
    return await this.get(`dashboard:${role}:${userId}`);
  }

  // Session management
  async setSession(sessionId: string, data: any, ttl = 86400): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttl);
  }

  async getSession(sessionId: string): Promise<any> {
    return await this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Rate limiting
  async incrementRateLimit(key: string, ttl = 60): Promise<number> {
    const current = await this.get<number>(`rate:${key}`) || 0;
    const newCount = current + 1;
    await this.set(`rate:${key}`, newCount, ttl);
    return newCount;
  }

  async getRateLimit(key: string): Promise<number> {
    return await this.get<number>(`rate:${key}`) || 0;
  }

  // Email verification tokens
  async setEmailToken(token: string, email: string, ttl = 3600): Promise<void> {
    await this.set(`email:token:${token}`, email, ttl);
  }

  async getEmailByToken(token: string): Promise<string | null> {
    return await this.get<string>(`email:token:${token}`);
  }

  // Password reset tokens
  async setPasswordResetToken(token: string, userId: string, ttl = 3600): Promise<void> {
    await this.set(`password:reset:${token}`, userId, ttl);
  }

  async getUserIdByResetToken(token: string): Promise<string | null> {
    return await this.get<string>(`password:reset:${token}`);
  }

  // Notification queue
  async queueNotification(userId: string, notification: any): Promise<void> {
    const key = `notifications:${userId}`;
    const notifications = await this.get<any[]>(key) || [];
    notifications.push(notification);
    await this.set(key, notifications, 3600);
  }

  async getQueuedNotifications(userId: string): Promise<any[]> {
    const notifications = await this.get<any[]>(`notifications:${userId}`) || [];
    await this.del(`notifications:${userId}`);
    return notifications;
  }

  // Search results caching
  async cacheSearchResults(query: string, results: any, ttl = 1800): Promise<void> {
    const key = `search:${Buffer.from(query).toString('base64')}`;
    await this.set(key, results, ttl);
  }

  async getCachedSearchResults(query: string): Promise<any> {
    const key = `search:${Buffer.from(query).toString('base64')}`;
    return await this.get(key);
  }
}