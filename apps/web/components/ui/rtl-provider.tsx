'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';

export function RTLProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  
  useEffect(() => {
    const html = document.documentElement;
    const isRTL = locale === 'he';
    
    if (isRTL) {
      html.setAttribute('dir', 'rtl');
      html.classList.add('rtl');
    } else {
      html.setAttribute('dir', 'ltr');
      html.classList.remove('rtl');
    }
    
    return () => {
      // Cleanup on unmount
      html.removeAttribute('dir');
      html.classList.remove('rtl');
    };
  }, [locale]);

  return <>{children}</>;
}