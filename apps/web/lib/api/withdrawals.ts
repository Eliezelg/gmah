import { apiClient } from './client';
import type {
  WithdrawalRequest,
  CreateWithdrawalRequest,
  UpdateWithdrawalRequest,
  ApproveWithdrawalRequest,
  RejectWithdrawalRequest,
  WithdrawalQuery,
  WithdrawalListResponse,
  TreasuryImpact,
  Deposit,
} from '@/types/withdrawal';

export class WithdrawalsService {
  
  /**
   * Create a new withdrawal request
   */
  static async create(data: CreateWithdrawalRequest): Promise<WithdrawalRequest> {
    const response = await apiClient.post<WithdrawalRequest>('/withdrawals/request', data);
    return response.data;
  }

  /**
   * Get all withdrawal requests with filtering and pagination
   */
  static async getAll(query: WithdrawalQuery = {}): Promise<WithdrawalListResponse> {
    const response = await apiClient.get<WithdrawalListResponse>('/withdrawals', {
      params: query,
    });
    return response.data;
  }

  /**
   * Get a specific withdrawal request by ID
   */
  static async getById(id: string): Promise<WithdrawalRequest> {
    const response = await apiClient.get<WithdrawalRequest>(`/withdrawals/${id}`);
    return response.data;
  }

  /**
   * Update a withdrawal request
   */
  static async update(id: string, data: UpdateWithdrawalRequest): Promise<WithdrawalRequest> {
    const response = await apiClient.patch<WithdrawalRequest>(`/withdrawals/${id}`, data);
    return response.data;
  }

  /**
   * Approve a withdrawal request
   */
  static async approve(id: string, data: ApproveWithdrawalRequest): Promise<WithdrawalRequest> {
    const response = await apiClient.post<WithdrawalRequest>(`/withdrawals/${id}/approve`, data);
    return response.data;
  }

  /**
   * Reject a withdrawal request
   */
  static async reject(id: string, data: RejectWithdrawalRequest): Promise<WithdrawalRequest> {
    const response = await apiClient.post<WithdrawalRequest>(`/withdrawals/${id}/reject`, data);
    return response.data;
  }

  /**
   * Execute an approved withdrawal request
   */
  static async execute(id: string): Promise<WithdrawalRequest> {
    const response = await apiClient.post<WithdrawalRequest>(`/withdrawals/${id}/execute`);
    return response.data;
  }

  /**
   * Get treasury impact of withdrawal requests
   */
  static async getTreasuryImpact(query?: { fromDate?: string; toDate?: string }): Promise<TreasuryImpact> {
    const response = await apiClient.get<TreasuryImpact>('/withdrawals/impact', {
      params: query,
    });
    return response.data;
  }

  /**
   * Cancel a withdrawal request (soft delete for pending requests)
   */
  static async cancel(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/withdrawals/${id}`);
    return response.data;
  }
}

export class DepositsService {
  
  /**
   * Get user's deposits available for withdrawal
   */
  static async getUserDeposits(): Promise<Deposit[]> {
    // This endpoint would need to be implemented in the backend
    const response = await apiClient.get<Deposit[]>('/deposits/my-deposits');
    return response.data;
  }

  /**
   * Get deposit by ID with current balance
   */
  static async getById(id: string): Promise<Deposit> {
    const response = await apiClient.get<Deposit>(`/deposits/${id}`);
    return response.data;
  }
}

// Utility functions for client-side operations
export const withdrawalUtils = {
  
  /**
   * Format withdrawal amount with currency
   */
  formatAmount: (amount: number, currency = 'ILS'): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },

  /**
   * Get status color for UI
   */
  getStatusColor: (status: string): string => {
    switch (status) {
      case 'PENDING':
        return 'yellow';
      case 'UNDER_REVIEW':
        return 'blue';
      case 'APPROVED':
        return 'green';
      case 'REJECTED':
        return 'red';
      case 'PROCESSING':
        return 'purple';
      case 'COMPLETED':
        return 'emerald';
      case 'CANCELLED':
        return 'gray';
      case 'FAILED':
        return 'red';
      default:
        return 'gray';
    }
  },

  /**
   * Get urgency color for UI
   */
  getUrgencyColor: (urgency: string): string => {
    switch (urgency) {
      case 'LOW':
        return 'green';
      case 'NORMAL':
        return 'blue';
      case 'HIGH':
        return 'orange';
      case 'URGENT':
        return 'red';
      default:
        return 'gray';
    }
  },

  /**
   * Check if withdrawal can be modified
   */
  canModify: (status: string): boolean => {
    return status === 'PENDING';
  },

  /**
   * Check if withdrawal can be cancelled
   */
  canCancel: (status: string): boolean => {
    return status === 'PENDING' || status === 'UNDER_REVIEW';
  },

  /**
   * Check if withdrawal can be approved/rejected
   */
  canApproveOrReject: (status: string): boolean => {
    return status === 'PENDING' || status === 'UNDER_REVIEW';
  },

  /**
   * Check if withdrawal can be executed
   */
  canExecute: (status: string): boolean => {
    return status === 'APPROVED';
  },

  /**
   * Calculate days since request
   */
  daysSinceRequest: (requestDate: string): number => {
    const now = new Date();
    const request = new Date(requestDate);
    const diffTime = Math.abs(now.getTime() - request.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Check if request is overdue (planned date passed)
   */
  isOverdue: (plannedDate?: string): boolean => {
    if (!plannedDate) return false;
    const now = new Date();
    const planned = new Date(plannedDate);
    return now > planned;
  },

  /**
   * Get approval mode badge text
   */
  getApprovalModeText: (mode: string): string => {
    switch (mode) {
      case 'AUTOMATIC':
        return 'Auto';
      case 'MANUAL':
        return 'Manual';
      case 'COMMITTEE':
        return 'Committee';
      default:
        return mode;
    }
  },
};