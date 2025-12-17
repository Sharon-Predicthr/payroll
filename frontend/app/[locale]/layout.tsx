import { Inter, Noto_Sans_Hebrew, Noto_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n';
import { DirectionProvider } from "@/contexts/DirectionContext";
import { PayrollPeriodProvider } from "@/contexts/PayrollPeriodContext";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const notoSansHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew"],
  display: "swap",
  variable: "--font-hebrew",
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-arabic",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

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

  // Determine font variable based on locale
  const fontVariable = locale === 'he' 
    ? notoSansHebrew.variable 
    : locale === 'ar' 
    ? notoSansArabic.variable 
    : inter.variable;

  return (
    <div className={`${inter.variable} ${notoSansHebrew.variable} ${notoSansArabic.variable}`}>
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

