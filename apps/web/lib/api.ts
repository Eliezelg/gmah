import { getAuthToken, getRefreshToken, setAuthToken, setRefreshToken, removeAuthToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options;
    
    const token = getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (token && !skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    // Handle token refresh
    if (response.status === 401 && !skipAuth) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setAuthToken(data.accessToken);
          setRefreshToken(data.refreshToken);
          
          // Retry original request
          headers['Authorization'] = `Bearer ${data.accessToken}`;
          const retryResponse = await fetch(`${API_URL}${endpoint}`, {
            ...fetchOptions,
            headers,
          });
          
          if (!retryResponse.ok) {
            throw new Error(`API Error: ${retryResponse.status}`);
          }
          
          return retryResponse.json();
        } else {
          removeAuthToken();
          window.location.href = '/login';
        }
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
  }

  async register(data: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Users
  async getUsers(params?: any) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/users${query ? `?${query}` : ''}`);
  }

  async getUser(id: string) {
    return this.request(`/users/${id}`);
  }

  async updateUser(id: string, data: any) {
    return this.request(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Loans
  async getLoans(params?: any) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/loans${query ? `?${query}` : ''}`);
  }

  async getLoan(id: string) {
    return this.request(`/loans/${id}`);
  }

  async createLoan(data: any) {
    return this.request('/loans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLoan(id: string, data: any) {
    return this.request(`/loans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async submitLoan(id: string) {
    return this.request(`/loans/${id}/submit`, {
      method: 'POST',
    });
  }

  async voteLoan(id: string, decision: string, comment?: string) {
    return this.request(`/loans/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ decision, comment }),
    });
  }

  async approveLoan(id: string, data?: any) {
    return this.request(`/loans/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async rejectLoan(id: string, reason: string) {
    return this.request(`/loans/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Documents
  async uploadDocument(file: File, loanId: string, type: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('loanId', loanId);
    formData.append('type', type);

    const token = getAuthToken();
    
    const response = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
  }

  async getDocuments(loanId: string) {
    return this.request(`/documents/loan/${loanId}`);
  }

  // Guarantees
  async getGuarantees(loanId: string) {
    return this.request(`/guarantees/loan/${loanId}`);
  }

  async createGuarantee(data: any) {
    return this.request('/guarantees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async signGuarantee(id: string, signature: string) {
    return this.request(`/guarantees/${id}/sign`, {
      method: 'POST',
      body: JSON.stringify({ signature }),
    });
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  }

  async markNotificationRead(ids: string[]) {
    return this.request('/notifications/read', {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
    });
  }

  // Treasury
  async getTreasuryDashboard() {
    return this.request('/treasury/dashboard');
  }

  async processLoanDisbursement(loanId: string, data: any) {
    return this.request(`/treasury/disbursements/${loanId}/process`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async recordPayment(data: any) {
    return this.request('/treasury/payments/record', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Reports
  async generateReport(type: string, params: any) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports/${type}?${query}`);
  }
}

export const api = new ApiClient();
export default api;