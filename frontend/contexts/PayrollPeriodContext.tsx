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

  const fetchPeriods = async () => {
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
      
      if (result.success && result.data) {
        const periodsData = Array.isArray(result.data) ? result.data : [];
        console.log('[PayrollPeriodContext] Periods data:', periodsData);
        setPeriods(periodsData);
        
        // Find current period (active and not closed)
        const activePeriod = periodsData.find(
          (p: PayrollPeriod) => p.is_active === true && p.is_closed === false
        );
        const defaultPeriod = activePeriod || periodsData[0] || null;
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

  useEffect(() => {
    fetchPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

