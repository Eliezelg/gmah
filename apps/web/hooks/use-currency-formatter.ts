import { useLocale } from 'next-intl';

export function useCurrencyFormatter() {
  const locale = useLocale();
  
  const formatCurrency = (amount: number) => {
    const localeMap: Record<string, { locale: string; currency: string }> = {
      fr: { locale: 'fr-FR', currency: 'EUR' },
      en: { locale: 'en-GB', currency: 'GBP' },
      he: { locale: 'he-IL', currency: 'ILS' },
    };
    
    const config = localeMap[locale] || localeMap.fr;
    
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
    }).format(amount);
  };

  return { formatCurrency };
}