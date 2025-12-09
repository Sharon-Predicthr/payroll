"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useDirection } from "@/contexts/DirectionContext";
import { saveAuthData, isAuthenticated } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const { direction } = useDirection();
  const t = useTranslations('auth.login');
  
  // Debug: Log locale and translation keys
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[LoginPage] Current locale:', locale);
      console.log('[LoginPage] Direction:', direction);
      console.log('[LoginPage] Title translation:', t('title'));
    }
  }, [locale, direction, t]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.push(`/${locale}`);
    }
  }, [router, locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsSubmitting(true);
    
    // Basic validation
    if (!email || !password) {
      setError(t('emailRequired'));
      setIsSubmitting(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('invalidEmail'));
      setIsSubmitting(false);
      return;
    }

    try {
      // Call login API via Next.js API route (which proxies to backend)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || t('error'));
        setIsSubmitting(false);
        return;
      }

      // Save auth data
      saveAuthData(data);
      setSuccess(true);
      
      // Redirect to dashboard (preserve current locale)
      setTimeout(() => {
        router.push(`/${locale}`);
      }, 500);
    } catch (err: any) {
      setError(t('error'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-main" dir={direction}>
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-10">
        <LanguageSwitcher />
      </div>
      
      <div className="w-full max-w-md p-8">
        <div className="bg-card-bg rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-main mb-2">PayLens</h1>
            <p className="text-text-muted">{t('title')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                {t('signingIn')}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-main mb-2">
                {t('email')}
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('email')}
                required
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-main mb-2">
                {t('password')}
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password')}
                required
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                />
                <label htmlFor="remember" className="ml-2 text-sm text-text-muted cursor-pointer">
                  {t('rememberMe')}
                </label>
              </div>
              <a href="#" className="text-sm text-primary hover:underline">
                {t('forgotPassword')}
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('signingIn') : t('signIn')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
