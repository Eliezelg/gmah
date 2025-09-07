'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { LanguageSelector } from '@/components/language-selector';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { refreshUser, isLoading, isAuthenticated, user } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const t = useTranslations('dashboard.layout.headers');

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Check if we have a token
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      // No token, redirect to login
      router.push('/login');
      setIsInitializing(false);
      return;
    }

    // If we have a token but no user data, refresh it
    if (token && !user && !isLoading) {
      refreshUser()
        .catch(() => {
          // Token is invalid, clear and redirect
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          router.push('/login');
        })
        .finally(() => {
          setIsInitializing(false);
        });
    } else {
      setIsInitializing(false);
    }
  }, [refreshUser, user, router, isLoading]);

  // Show loading while checking auth
  if (isInitializing || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no user after loading, don't render (will redirect)
  if (!user) {
    return null;
  }

  return (
    <NotificationProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center px-4 py-3 lg:px-8">
              <h1 className="text-xl font-semibold">
                {user?.role === 'BORROWER' && t('borrower')}
                {user?.role === 'TREASURER' && t('treasurer')}
                {user?.role === 'COMMITTEE_MEMBER' && t('committee')}
                {user?.role === 'ADMIN' && t('admin')}
                {user?.role === 'SUPER_ADMIN' && t('superAdmin')}
              </h1>
              <div className="flex items-center gap-2">
                <LanguageSelector />
                <NotificationBell />
              </div>
            </div>
          </div>
          <div className="container mx-auto px-4 py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </NotificationProvider>
  );
}