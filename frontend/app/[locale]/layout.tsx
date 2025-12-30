import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n';
import { DirectionProvider } from "@/contexts/DirectionContext";
import { PayrollPeriodProvider } from "@/contexts/PayrollPeriodContext";

// Fonts are loaded via CSS in globals.css to avoid build-time network dependency
// This allows Docker builds to succeed without internet access

// Force dynamic rendering to avoid static generation issues with next-intl
// This prevents Next.js from trying to statically generate pages that use headers
export const dynamic = 'force-dynamic';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }> | { locale: string };
}) {
  // Handle both sync and async params (Next.js 14/15 compatibility)
  const resolvedParams = await Promise.resolve(params);
  const locale = resolvedParams.locale;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Load messages for the locale
  let messages;
  try {
    // Explicitly pass the locale to getMessages to ensure correct locale is used
    messages = await getMessages({ locale });
    if (process.env.NODE_ENV === 'development') {
      const authKeys = messages?.auth?.login ? Object.keys(messages.auth.login) : [];
      console.log(`[LocaleLayout] Loaded messages for locale: ${locale}, auth.login keys: ${authKeys.length}`);
    }
  } catch (error) {
    console.error(`[LocaleLayout] Failed to load messages for locale: ${locale}`, error);
    // Fallback to empty messages object
    messages = {};
  }

  return (
    <div>
      <NextIntlClientProvider messages={messages}>
        <DirectionProvider locale={locale}>
          <PayrollPeriodProvider>
            {children}
          </PayrollPeriodProvider>
        </DirectionProvider>
      </NextIntlClientProvider>
    </div>
  );
}
