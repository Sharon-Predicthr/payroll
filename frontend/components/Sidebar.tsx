"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import { useDirection } from "@/contexts/DirectionContext";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { direction } = useDirection();
  const t = useTranslations('navigation');

  const navItems: NavItem[] = [
    {
      label: t('dashboard'),
      path: "/",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      label: t('payroll'),
      path: "/payroll",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: t('employees'),
      path: "/employees",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      label: t('payslips'),
      path: "/payslips",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      label: t('organization'),
      path: "/organization",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    },
    {
      label: t('reports'),
      path: "/reports",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      label: t('settings'),
      path: "/settings",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
    {
      label: t('integrations'),
      path: "/integrations",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      label: t('notifications'),
      path: "/notifications",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      ),
    },
  ];

  const handleNavigation = (e: React.MouseEvent, localePath: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(localePath);
  };

  // Debug: Log when sidebar renders
  console.log('[Sidebar] Rendering sidebar, pathname:', pathname);

  return (
    <aside 
      className="w-64 bg-white border-r rtl:border-r-0 rtl:border-l border-gray-200 h-screen sticky top-0 flex-shrink-0 flex flex-col"
      style={{ zIndex: 50, position: 'sticky', pointerEvents: 'auto' }}
      onMouseEnter={() => console.log('[Sidebar] Mouse entered sidebar')}
      onMouseLeave={() => console.log('[Sidebar] Mouse left sidebar')}
      onClick={(e) => {
        console.log('[Sidebar] Click on aside element:', {
          target: e.target,
          currentTarget: e.currentTarget,
        });
      }}
    >
      {/* Navigation */}
      <nav 
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" 
        style={{ zIndex: 50, pointerEvents: 'auto' }}
        onClick={(e) => {
          console.log('[Sidebar] Click on nav element:', {
            target: e.target,
            currentTarget: e.currentTarget,
          });
        }}
      >
        {navItems.map((item) => {
          // Build locale-aware path
          const localePath = item.path === "/" ? `/${locale}` : `/${locale}${item.path}`;
          // Check if current path matches (with or without locale prefix)
          const isActive = pathname === localePath || 
            pathname === item.path || 
            (item.path !== "/" && (pathname?.startsWith(localePath) || pathname?.startsWith(item.path)));
          
          return (
            <button
              key={item.path}
              onMouseDown={(e) => {
                console.log('[Sidebar] MouseDown event:', item.path, localePath, {
                  target: e.target,
                  currentTarget: e.currentTarget,
                  button: e.button,
                  defaultPrevented: e.defaultPrevented,
                });
              }}
              onMouseUp={(e) => {
                console.log('[Sidebar] MouseUp event:', item.path, localePath, {
                  target: e.target,
                  currentTarget: e.currentTarget,
                  button: e.button,
                });
              }}
              onClick={(e) => {
                console.log('[Sidebar] onClick event triggered:', item.path, localePath, {
                  target: e.target,
                  currentTarget: e.currentTarget,
                  isPropagationStopped: false,
                  defaultPrevented: e.defaultPrevented,
                  timeStamp: e.timeStamp,
                });
                
                e.preventDefault();
                e.stopPropagation();
                
                console.log('[Sidebar] After preventDefault/stopPropagation');
                console.log('[Sidebar] Navigating to:', localePath);
                
                try {
                  router.push(localePath);
                  console.log('[Sidebar] router.push called successfully');
                } catch (error) {
                  console.error('[Sidebar] Error in router.push:', error);
                }
              }}
              onPointerDown={(e) => {
                console.log('[Sidebar] PointerDown event:', item.path, {
                  pointerType: e.pointerType,
                  pointerId: e.pointerId,
                });
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                "hover:bg-gray-50 cursor-pointer",
                isActive
                  ? "bg-blue-50 text-blue-600 font-semibold shadow-sm"
                  : "text-gray-700 hover:text-gray-900",
                direction === "rtl" && "flex-row-reverse"
              )}
              type="button"
              style={{ 
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 100,
              }}
            >
              <span className={cn("flex-shrink-0", isActive ? "text-blue-600" : "text-gray-500")}>
                {item.icon}
              </span>
              <span className="text-right rtl:text-right">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
