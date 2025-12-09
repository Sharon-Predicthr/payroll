import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { getLocale } from 'next-intl/server';

// Supported locales
export const locales = ['en', 'he', 'ar'] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = 'en';

// Locale to direction mapping
export const localeDirection: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  he: 'rtl',
  ar: 'rtl',
};

// Locale names for display
export const localeNames: Record<Locale, string> = {
  en: 'English',
  he: 'עברית',
  ar: 'العربية',
};

export default getRequestConfig(async (opts) => {
  // Handle both 'locale' and 'requestLocale' parameter names (different next-intl versions)
  let locale: string | undefined | Promise<string> = (opts as any).requestLocale || (opts as any).locale;
  
  // Handle Promise-based locale (Next.js 15 async params)
  if (locale && typeof locale === 'object' && 'then' in locale && typeof (locale as any).then === 'function') {
    try {
      locale = await (locale as Promise<string>);
    } catch (error) {
      console.error('[i18n] Error awaiting locale Promise:', error);
      locale = undefined;
    }
  }
  
  // If locale is still not provided, try to get it from the request
  if (!locale) {
    try {
      locale = await getLocale();
    } catch (error) {
      // getLocale() might fail in some contexts (e.g., during build)
      // This is expected during static generation, so we'll use default
    }
  }
  
  // Ensure locale is provided and valid
  let validLocale: Locale = defaultLocale;
  
  if (!locale || typeof locale !== 'string') {
    // Only warn in development, not during build
    if (process.env.NODE_ENV === 'development') {
      console.warn('No locale provided, using default:', defaultLocale);
    }
    validLocale = defaultLocale;
  } else if (!locales.includes(locale as Locale)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Invalid locale: ${locale}, using default:`, defaultLocale);
    }
    validLocale = defaultLocale;
  } else {
    validLocale = locale as Locale;
  }

  try {
    const messages = (await import(`./messages/${validLocale}.json`)).default;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[i18n] Loaded ${Object.keys(messages).length} message keys for locale: ${validLocale}`);
    }
    return {
      locale: validLocale,
      messages,
    };
  } catch (error) {
    console.error(`Failed to load messages for locale: ${validLocale}`, error);
    // Fallback to English messages if locale messages fail to load
    try {
      const fallbackMessages = (await import(`./messages/${defaultLocale}.json`)).default;
      return {
        locale: defaultLocale,
        messages: fallbackMessages,
      };
    } catch (fallbackError) {
      console.error('Failed to load fallback messages:', fallbackError);
      return {
        locale: defaultLocale,
        messages: {},
      };
    }
  }
});

