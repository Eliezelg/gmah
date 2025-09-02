import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export const locales = ['fr', 'en', 'he'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

export const localeNames: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  he: 'עברית',
};

export const localeDirection: Record<Locale, 'ltr' | 'rtl'> = {
  fr: 'ltr',
  en: 'ltr',
  he: 'rtl',
};

export default getRequestConfig(async ({ locale }) => {
  // Ensure we always have a locale
  if (!locale) {
    locale = defaultLocale;
  }

  // Validate that the incoming locale is valid
  const isValidLocale = locales.includes(locale as any);
  const validLocale = isValidLocale ? locale : defaultLocale;

  try {
    return {
      messages: (await import(`./messages/${validLocale}.json`)).default,
      locale: validLocale,
    };
  } catch (error) {
    // Fallback to default locale if message file not found
    return {
      messages: (await import(`./messages/${defaultLocale}.json`)).default,
      locale: defaultLocale,
    };
  }
});