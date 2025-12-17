"use client";

import { useEffect } from "react";
import { usePayrollPeriod, PayrollPeriod } from "@/contexts/PayrollPeriodContext";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function PayrollPeriodSelector() {
  const { periods, currentPeriod, selectedPeriod, setSelectedPeriod, loading, error } = usePayrollPeriod();
  
  // Debug logging
  useEffect(() => {
    console.log('[PayrollPeriodSelector] periods:', periods);
    console.log('[PayrollPeriodSelector] loading:', loading);
    console.log('[PayrollPeriodSelector] error:', error);
    console.log('[PayrollPeriodSelector] selectedPeriod:', selectedPeriod);
  }, [periods, loading, error, selectedPeriod]);

  const handleChange = (periodId: string) => {
    const period = periods.find((p) => p.period_id === periodId);
    if (period) {
      setSelectedPeriod(period);
    }
  };

  const formatPeriodDisplay = (period: PayrollPeriod | null) => {
    if (!period) return "אין תקופה";
    return period.period_description || period.period_id;
  };

  const getPeriodStatus = (period: PayrollPeriod) => {
    if (period.is_closed) return "סגור";
    if (period.is_active) return "פעיל";
    return "לא פעיל";
  };

  const getStatusColor = (period: PayrollPeriod) => {
    if (period.is_closed) return "text-gray-500";
    if (period.is_active) return "text-green-600 font-semibold";
    return "text-gray-400";
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">טוען תקופות...</span>
      </div>
    );
  }

  if (periods.length === 0 && !loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-sm text-yellow-700">
          {error ? `שגיאה: ${error}` : "אין תקופות שכר זמינות - נא ליצור תקופה חדשה"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">תקופת שכר:</span>
      <div className="relative">
        <Select
          value={selectedPeriod?.period_id || ""}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            "min-w-[200px] h-9 text-sm",
            selectedPeriod?.is_active && !selectedPeriod?.is_closed
              ? "border-green-300 bg-green-50 text-green-700"
              : selectedPeriod?.is_closed
              ? "border-gray-300 bg-gray-50 text-gray-600"
              : "border-gray-300 bg-white"
          )}
        >
          {periods.map((period) => (
            <option key={period.period_id} value={period.period_id}>
              {formatPeriodDisplay(period)} - {getPeriodStatus(period)}
            </option>
          ))}
        </Select>
      </div>
      
      {/* Status indicator */}
      {selectedPeriod && (
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
          selectedPeriod.is_active && !selectedPeriod.is_closed
            ? "bg-green-100 text-green-700"
            : selectedPeriod.is_closed
            ? "bg-gray-100 text-gray-600"
            : "bg-yellow-100 text-yellow-700"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            selectedPeriod.is_active && !selectedPeriod.is_closed
              ? "bg-green-500"
              : selectedPeriod.is_closed
              ? "bg-gray-400"
              : "bg-yellow-500"
          )}></div>
          <span>{getPeriodStatus(selectedPeriod)}</span>
        </div>
      )}
    </div>
  );
}

