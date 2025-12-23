"use client";

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales, localeNames, localeDirection, type Locale } from '@/i18n';
import { useDirection } from '@/contexts/DirectionContext';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname(); // This includes the locale prefix (e.g., /en/login)
  const { setDirection } = useDirection();

  const switchLocale = (newLocale: Locale) => {
    // Extract path without locale prefix
    let pathWithoutLocale = pathname;
    
    // Remove any locale prefix from the pathname
    for (const loc of locales) {
      if (pathname.startsWith(`/${loc}/`)) {
        pathWithoutLocale = pathname.slice(`/${loc}`.length);
        break;
      } else if (pathname === `/${loc}`) {
        pathWithoutLocale = '/';
        break;
      }
    }
    
    // Ensure path starts with /
    if (!pathWithoutLocale.startsWith('/')) {
      pathWithoutLocale = '/' + pathWithoutLocale;
    }
    
    // If path is empty after removing locale, use root
    if (pathWithoutLocale === '') {
      pathWithoutLocale = '/';
    }
    
    // Navigate to new locale - use window.location for full page reload
    const newPath = pathWithoutLocale === '/' ? `/${newLocale}` : `/${newLocale}${pathWithoutLocale}`;
    
    // Update direction context based on new locale
    const newDirection = localeDirection[newLocale] || 'ltr';
    setDirection(newDirection);
    
    // Use window.location for full page reload to ensure locale change is applied
    if (typeof window !== 'undefined') {
      window.location.href = newPath;
    } else {
      router.push(newPath);
      router.refresh();
    }
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-main hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Switch language"
        aria-expanded={isOpen}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
        <span>{localeNames[locale]}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-1 right-0 rtl:right-auto rtl:left-0 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="py-1">
              {locales.map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    switchLocale(loc);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left rtl:text-right px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                    locale === loc ? 'bg-primary/10 text-primary font-medium' : 'text-text-main'
                  }`}
                >
                  {localeNames[loc]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

