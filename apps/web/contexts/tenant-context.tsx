'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCookie } from 'cookies-next';

interface TenantSettings {
  // Basic information
  name: string;
  slug: string;
  domain: string;
  
  // Branding
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  
  // Custom content
  homeTitle?: string;
  homeDescription?: string;
  homeHeroImage?: string;
  customFooterText?: string;
  
  // Contact info
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  
  // Social links
  websiteUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  
  // Features
  features?: {
    twoFactorAuth?: boolean;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    advancedReporting?: boolean;
    customFields?: boolean;
  };
  
  // Limits
  limits?: {
    maxUsers?: number;
    maxLoans?: number;
    maxStorage?: string;
  };
  
  // Custom settings
  loanCategories?: Array<{
    name: string;
    maxAmount: number;
    maxDuration: number;
  }>;
}

interface TenantContextType {
  tenantId: string | null;
  tenantSettings: TenantSettings | null;
  isLoading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  tenantSettings: null,
  isLoading: true,
  error: null,
  refreshSettings: async () => {},
});

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: React.ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detect tenant from cookie or subdomain
  useEffect(() => {
    const detectTenant = () => {
      // First check cookie
      const cookieTenant = getCookie('tenant-id') as string;
      if (cookieTenant) {
        setTenantId(cookieTenant);
        return cookieTenant;
      }

      // Then check subdomain
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      
      const reservedSubdomains = ['www', 'app', 'localhost', '127'];
      if (!reservedSubdomains.includes(subdomain) && hostname.includes('.')) {
        setTenantId(subdomain);
        return subdomain;
      }

      return null;
    };

    const tenant = detectTenant();
    if (tenant) {
      fetchTenantSettings(tenant);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchTenantSettings = async (tenant: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/tenants/${tenant}/settings`);
      
      if (!response.ok) {
        // If tenant settings not found, use defaults
        if (response.status === 404) {
          setTenantSettings(getDefaultSettings(tenant));
        } else {
          throw new Error('Failed to fetch tenant settings');
        }
      } else {
        const data = await response.json();
        setTenantSettings(data);
      }
    } catch (err) {
      console.error('Error fetching tenant settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Use default settings as fallback
      setTenantSettings(getDefaultSettings(tenant));
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultSettings = (tenant: string): TenantSettings => ({
    name: tenant.charAt(0).toUpperCase() + tenant.slice(1),
    slug: tenant,
    domain: `${tenant}.gmah.com`,
    primaryColor: '#4F46E5',
    secondaryColor: '#7C3AED',
    homeTitle: `Bienvenue chez ${tenant.charAt(0).toUpperCase() + tenant.slice(1)}`,
    homeDescription: 'Plateforme de gestion de prêts communautaires',
    customFooterText: `© 2024 ${tenant.charAt(0).toUpperCase() + tenant.slice(1)}. Tous droits réservés.`,
    features: {
      twoFactorAuth: true,
      emailNotifications: true,
      smsNotifications: false,
      advancedReporting: true,
      customFields: false,
    },
    limits: {
      maxUsers: 100,
      maxLoans: 1000,
      maxStorage: '1GB',
    },
  });

  const refreshSettings = async () => {
    if (tenantId) {
      await fetchTenantSettings(tenantId);
    }
  };

  // Apply custom CSS variables for theming
  useEffect(() => {
    if (tenantSettings?.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', tenantSettings.primaryColor);
    }
    if (tenantSettings?.secondaryColor) {
      document.documentElement.style.setProperty('--secondary-color', tenantSettings.secondaryColor);
    }
    
    // Update page title
    if (tenantSettings?.name) {
      document.title = tenantSettings.name;
    }
    
    // Update favicon
    if (tenantSettings?.favicon) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = tenantSettings.favicon;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [tenantSettings]);

  return (
    <TenantContext.Provider
      value={{
        tenantId,
        tenantSettings,
        isLoading,
        error,
        refreshSettings,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

// Hook for checking if we're on a tenant subdomain
export const useIsTenant = (): boolean => {
  const { tenantId } = useTenant();
  return tenantId !== null;
};

// Hook for getting tenant-specific routes
export const useTenantRoute = (path: string): string => {
  const { tenantId } = useTenant();
  if (tenantId && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.startsWith(tenantId)) {
      return path; // Already on tenant subdomain
    }
    // Construct tenant URL
    return `https://${tenantId}.gmah.com${path}`;
  }
  return path;
};