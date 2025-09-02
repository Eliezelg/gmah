import { useTranslations as useNextIntlTranslations } from 'next-intl';

export function useTranslations(namespace?: string) {
  return useNextIntlTranslations(namespace);
}

// Hook pour obtenir la direction du texte selon la locale
export function useTextDirection() {
  const t = useNextIntlTranslations();
  const locale = t('_locale') as string;
  
  return locale === 'he' ? 'rtl' : 'ltr';
}

// Hook pour formater les dates selon la locale
export function useDateFormatter() {
  const t = useNextIntlTranslations();
  const locale = t('_locale') as string;
  
  return (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : locale === 'en' ? 'en-US' : 'fr-FR').format(dateObj);
  };
}

// Hook pour formater les montants selon la locale
export function useCurrencyFormatter() {
  const t = useNextIntlTranslations();
  const locale = t('_locale') as string;
  
  return (amount: number, currency = 'EUR') => {
    const currencyMap: { [key: string]: string } = {
      fr: 'EUR',
      en: 'USD',
      he: 'ILS',
    };
    
    const selectedCurrency = currencyMap[locale] || currency;
    
    return new Intl.NumberFormat(
      locale === 'he' ? 'he-IL' : locale === 'en' ? 'en-US' : 'fr-FR',
      {
        style: 'currency',
        currency: selectedCurrency,
      }
    ).format(amount);
  };
}