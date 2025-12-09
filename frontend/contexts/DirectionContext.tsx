"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocale } from 'next-intl';
import { localeDirection, type Locale } from '@/i18n';

type Direction = "ltr" | "rtl";

interface DirectionContextType {
  direction: Direction;
  toggleDirection: () => void;
  setDirection: (dir: Direction) => void;
}

const DirectionContext = createContext<DirectionContextType | undefined>(undefined);

export function DirectionProvider({ 
  children, 
  locale: propLocale 
}: { 
  children: ReactNode;
  locale?: string;
}) {
  // Use prop locale if provided, otherwise use hook (which requires client component)
  let currentLocale: Locale = 'en';
  try {
    if (propLocale) {
      currentLocale = propLocale as Locale;
    } else {
      const hookLocale = useLocale();
      currentLocale = hookLocale as Locale;
    }
  } catch (e) {
    // Fallback if useLocale fails (shouldn't happen but safety check)
    currentLocale = (propLocale || 'en') as Locale;
  }

  const localeDir = localeDirection[currentLocale] || 'ltr';
  const [direction, setDirectionState] = useState<Direction>(localeDir);

  // Update direction when locale changes
  useEffect(() => {
    const newDirection = localeDirection[currentLocale] || 'ltr';
    setDirectionState(newDirection);
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute("dir", newDirection);
      document.documentElement.setAttribute("lang", currentLocale);
      // Also update body to ensure font is applied
      document.body.setAttribute("dir", newDirection);
      document.body.setAttribute("lang", currentLocale);
      // Force a re-render to ensure fonts are applied
      document.body.style.fontFamily = '';
      setTimeout(() => {
        document.body.style.fontFamily = '';
      }, 0);
    }
  }, [currentLocale]);

  // Update document when direction changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute("dir", direction);
      document.body.setAttribute("dir", direction);
      localStorage.setItem("direction", direction);
    }
  }, [direction]);

  const toggleDirection = () => {
    setDirectionState((prev) => (prev === "ltr" ? "rtl" : "ltr"));
  };

  const setDirection = (dir: Direction) => {
    setDirectionState(dir);
  };

  return (
    <DirectionContext.Provider value={{ direction, toggleDirection, setDirection }}>
      {children}
    </DirectionContext.Provider>
  );
}

export function useDirection() {
  const context = useContext(DirectionContext);
  if (context === undefined) {
    throw new Error("useDirection must be used within a DirectionProvider");
  }
  return context;
}

