'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { refreshUser, user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Check for token and refresh user on app load
    const token = localStorage.getItem('access_token');
    
    if (token && !user) {
      // We have a token but no user data, refresh it
      refreshUser().catch(() => {
        // Token is invalid, clear it
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      });
    }
  }, []); // Run only once on mount

  return <>{children}</>;
}