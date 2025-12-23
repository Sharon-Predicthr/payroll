"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { useDirection } from "@/contexts/DirectionContext";
import { getUser, getTenant, clearAuthData, isAuthenticated } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PayrollPeriodSelector } from "@/components/PayrollPeriodSelector";

export function TopBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const { direction } = useDirection();
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [tenant, setTenant] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    // Load user and tenant info from localStorage
    if (isAuthenticated()) {
      setUser(getUser());
      setTenant(getTenant());
    }
  }, []);

  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      setIsDropdownOpen(false);
      
      const token = localStorage.getItem('paylens_access_token');
      if (token) {
        // Call logout endpoint via Next.js API route
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
        } catch (fetchError) {
          // Ignore fetch errors - still clear local data
          console.warn('Logout API call failed, but continuing with logout:', fetchError);
        }
      }
      
      // Always clear local data
      clearAuthData();
      
      // Get locale from pathname or default to 'he'
      const locale = typeof window !== 'undefined' 
        ? (window.location.pathname.split('/')[1] || 'he')
        : 'he';
      
      // Use window.location for immediate redirect
      if (typeof window !== 'undefined') {
        window.location.href = `/${locale}/login`;
      } else {
        router.push(`/${locale}/login`);
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even on error, try to clear and redirect
      clearAuthData();
      const locale = typeof window !== 'undefined' 
        ? (window.location.pathname.split('/')[1] || 'he')
        : 'he';
      if (typeof window !== 'undefined') {
        window.location.href = `/${locale}/login`;
      }
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center cursor-pointer" onClick={() => router.push("/")}>
              <span className="text-white font-semibold text-sm">PL</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 cursor-pointer whitespace-nowrap" onClick={() => router.push("/")}>
              PayLens
            </span>
          </div>

          {/* Payroll Period Selector */}
          <div className="flex-1 flex justify-center min-w-0">
            <PayrollPeriodSelector />
          </div>

          {/* Search - Larger */}
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <input
                type="search"
                placeholder="Search employees, payslips, payroll actions..."
                className="w-full pl-11 pr-4 rtl:pl-4 rtl:pr-11 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
              <svg
                className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Right side - Flex shrink 0 to prevent overflow */}
          <div className="flex items-center gap-3 flex-shrink-0">
            
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Notifications */}
            <NotificationBell />

            {/* User Avatar Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 pl-3 rtl:pl-0 rtl:pr-3 border-l rtl:border-l-0 rtl:border-r border-gray-200 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden lg:block text-left rtl:text-right">
                  <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
                    {user?.email || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 whitespace-nowrap">
                    {tenant?.name || 'Tenant'}
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsDropdownOpen(false)}
                  ></div>
                  <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Profile
                    </a>
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      {tCommon('settings')}
                    </a>
                    <hr className="my-2 border-gray-200" />
                    <button
                      onClick={(e) => handleLogout(e)}
                      className="block w-full text-left rtl:text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      type="button"
                    >
                      {t('logout')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

