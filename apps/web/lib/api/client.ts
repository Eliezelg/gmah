import axios from 'axios';
import { getCookie } from 'cookies-next';

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add tenant header and auth token
apiClient.interceptors.request.use(
  (config) => {
    // Add tenant header if available
    const tenantId = getCookie('tenantId');
    if (tenantId) {
      config.headers['X-Tenant-Id'] = tenantId;
    }

    // Add auth token if available
    const token = getCookie('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific error codes
      switch (error.response.status) {
        case 401:
          // Redirect to login on unauthorized
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          break;
        case 403:
          // Handle forbidden access
          console.error('Access forbidden:', error.response.data);
          break;
        case 404:
          // Handle not found
          console.error('Resource not found:', error.response.data);
          break;
        case 500:
          // Handle server errors
          console.error('Server error:', error.response.data);
          break;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;