"use client";

import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { useDirection } from "@/contexts/DirectionContext";
import { useState, useEffect, useRef } from "react";

interface PageShellProps {
  children: React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  const { direction } = useDirection();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug: Log layout structure (must be called before any early returns)
  // Use ref to track if we've logged to avoid logging on every render
  const hasLoggedRef = useRef(false);
  useEffect(() => {
    if (!mounted) return; // Only log after component is mounted
    if (hasLoggedRef.current) return; // Only log once
    
    hasLoggedRef.current = true;
    console.log('[PageShell] Layout rendered, direction:', direction);
    const sidebar = document.querySelector('aside');
    const mainContent = document.querySelector('main');
    if (sidebar && mainContent) {
      const sidebarRect = sidebar.getBoundingClientRect();
      const mainRect = mainContent.getBoundingClientRect();
      const sidebarStyles = window.getComputedStyle(sidebar);
      const mainStyles = window.getComputedStyle(mainContent);
      console.log('[PageShell] Sidebar rect:', sidebarRect);
      console.log('[PageShell] Sidebar styles:', {
        zIndex: sidebarStyles.zIndex,
        position: sidebarStyles.position,
        pointerEvents: sidebarStyles.pointerEvents,
      });
      console.log('[PageShell] Main content rect:', mainRect);
      console.log('[PageShell] Main content styles:', {
        zIndex: mainStyles.zIndex,
        pointerEvents: mainStyles.pointerEvents,
      });
      console.log('[PageShell] Do they overlap?', 
        sidebarRect.right > mainRect.left && sidebarRect.left < mainRect.right);
    }
  }, [direction, mounted]);

  if (!mounted) {
    // Return a consistent structure during SSR
    return (
      <div className="min-h-screen bg-gray-50 flex" dir="ltr">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen bg-gray-50 flex ${direction === "rtl" ? "flex-row-reverse" : ""}`} 
      dir={direction}
      onClick={(e) => {
        // Debug: log all clicks on the page shell
        const target = e.target as HTMLElement;
        const isSidebar = target.closest('aside');
        if (!isSidebar) {
          console.log('[PageShell] Click detected outside sidebar:', {
            target: target.tagName,
            className: target.className,
            id: target.id,
          });
        }
      }}
    >
      {/* Sidebar - Sticky positioning, part of normal flow */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0" style={{ pointerEvents: 'auto' }}>
        {/* Top Bar */}
        <TopBar />

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto" style={{ pointerEvents: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}
