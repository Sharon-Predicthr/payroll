"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { isAuthenticated, getAuthHeader } from "@/lib/auth";

export interface PayrollPeriod {
  period_id: string;
  period_description: string;
  period_start_date: Date | string;
  period_end_date: Date | string;
  is_active: boolean;
  is_closed: boolean;
  client_id?: string;
}

interface PayrollPeriodContextType {
  periods: PayrollPeriod[];
  currentPeriod: PayrollPeriod | null;
  selectedPeriod: PayrollPeriod | null;
  setSelectedPeriod: (period: PayrollPeriod | null) => void;
  loading: boolean;
  error: string | null;
  refreshPeriods: () => Promise<void>;
}

const PayrollPeriodContext = createContext<PayrollPeriodContextType | undefined>(undefined);

export function PayrollPeriodProvider({ children }: { children: ReactNode }) {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Wait for component to mount (client-side) before checking auth
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchPeriods = async () => {
    // Wait for mount to ensure localStorage is available
    if (!mounted) {
      return;
    }

    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const authHeader = getAuthHeader();
      if (!authHeader) {
        throw new Error("לא מאומת - נא להתחבר מחדש");
      }

      const response = await fetch("/api/payroll-periods", {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "שגיאה בטעינת תקופות השכר");
      }

      const result = await response.json();
      console.log('[PayrollPeriodContext] API response:', result);
      console.log('[PayrollPeriodContext] Response status:', response.status);
      console.log('[PayrollPeriodContext] Response ok:', response.ok);
      
      if (result.success && result.data) {
        const periodsData = Array.isArray(result.data) ? result.data : [];
        console.log('[PayrollPeriodContext] Periods data:', periodsData);
        console.log('[PayrollPeriodContext] Periods count:', periodsData.length);
        setPeriods(periodsData);
        
        // Find current period: the period with maximum period_id (not closed)
        // Sort by period_id descending to find the maximum
        const sortedPeriods = [...periodsData].sort((a: PayrollPeriod, b: PayrollPeriod) => {
          return b.period_id.localeCompare(a.period_id);
        });
        // Get the maximum period_id that is not closed, or just the maximum if all are closed
        const activePeriod = sortedPeriods.find(
          (p: PayrollPeriod) => !p.is_closed
        ) || sortedPeriods[0] || null;
        const defaultPeriod = activePeriod;
        setCurrentPeriod(defaultPeriod);
        
        // Set selected period if not already set
        if (!selectedPeriod && defaultPeriod) {
          setSelectedPeriod(defaultPeriod);
        }
      } else {
        console.warn('[PayrollPeriodContext] Unexpected response format:', result);
        setPeriods([]);
      }
    } catch (err: any) {
      console.error("Error fetching payroll periods:", err);
      setError(err.message || "שגיאה בטעינת תקופות השכר");
      // Don't set periods to empty array on error - keep existing data if any
      // setPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch periods when component mounts and when authentication state changes
  useEffect(() => {
    if (!mounted) return;

    // Small delay to ensure localStorage is ready after navigation
    const timer = setTimeout(() => {
      if (isAuthenticated()) {
        console.log('[PayrollPeriodContext] Mounted and authenticated, fetching periods...');
        fetchPeriods();
      } else {
        console.log('[PayrollPeriodContext] Mounted but not authenticated yet');
        setLoading(false);
      }
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Also listen for storage changes (when token is set after login)
  useEffect(() => {
    if (!mounted) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'paylens_access_token' && e.newValue) {
        // Token was set, fetch periods
        console.log('[PayrollPeriodContext] Token detected in storage, fetching periods...');
        fetchPeriods();
      }
    };

    // Custom event for same-tab storage changes (localStorage doesn't fire storage event in same tab)
    const handleCustomStorageChange = () => {
      if (isAuthenticated() && periods.length === 0) {
        console.log('[PayrollPeriodContext] Custom storage change detected, fetching periods...');
        fetchPeriods();
      }
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom event (can be dispatched after login)
    window.addEventListener('authStateChanged', handleCustomStorageChange);

    // Poll for token if not authenticated yet (for a short time after mount)
    let pollCount = 0;
    const maxPolls = 10; // Poll for up to 2 seconds (10 * 200ms)
    const pollInterval = setInterval(() => {
      pollCount++;
      if (isAuthenticated() && periods.length === 0 && !loading) {
        console.log('[PayrollPeriodContext] Token detected via polling, fetching periods...');
        fetchPeriods();
        clearInterval(pollInterval);
      } else if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        if (!isAuthenticated()) {
          setLoading(false);
        }
      }
    }, 200);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleCustomStorageChange);
      clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, periods.length, loading]);

  return (
    <PayrollPeriodContext.Provider
      value={{
        periods,
        currentPeriod,
        selectedPeriod,
        setSelectedPeriod,
        loading,
        error,
        refreshPeriods: fetchPeriods,
      }}
    >
      {children}
    </PayrollPeriodContext.Provider>
  );
}

export function usePayrollPeriod() {
  const context = useContext(PayrollPeriodContext);
  if (context === undefined) {
    throw new Error("usePayrollPeriod must be used within a PayrollPeriodProvider");
  }
  return context;
}

