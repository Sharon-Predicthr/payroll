"use client";

import { useEffect, useState } from "react";
import { usePayrollPeriod, PayrollPeriod } from "@/contexts/PayrollPeriodContext";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isAdmin } from "@/lib/auth";
import { CreatePayrollPeriodDialog } from "@/components/CreatePayrollPeriodDialog";

export function PayrollPeriodSelector() {
  const { periods, currentPeriod, selectedPeriod, setSelectedPeriod, loading, error, refreshPeriods } = usePayrollPeriod();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  
  // Check if user is admin
  useEffect(() => {
    setUserIsAdmin(isAdmin());
  }, []);
  
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
      <>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm text-yellow-700">
            {error ? `שגיאה: ${error}` : "אין תקופות שכר זמינות"}
          </span>
          {userIsAdmin && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="h-7 px-3 text-xs"
              variant="outline"
            >
              צור תקופה חדשה
            </Button>
          )}
        </div>
        {userIsAdmin && (
          <CreatePayrollPeriodDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onSuccess={() => {
              refreshPeriods();
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600 whitespace-nowrap">תקופת שכר:</span>
      {/* Create period button next to label (admin only) */}
      {userIsAdmin && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowCreateDialog(true);
          }}
          className="h-6 w-6 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-sm flex-shrink-0"
          title="צור תקופת שכר חדשה"
          type="button"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
      <div className="relative flex items-center gap-2">
        <Select
          value={selectedPeriod?.period_id || ""}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            "min-w-[160px] h-8 text-xs px-2 py-1",
            selectedPeriod?.is_active && !selectedPeriod?.is_closed
              ? "border-green-300 bg-green-50 text-green-700"
              : selectedPeriod?.is_closed
              ? "border-gray-300 bg-gray-50 text-gray-600"
              : "border-gray-300 bg-white"
          )}
        >
          {periods.map((period) => (
            <option key={period.period_id} value={period.period_id}>
              {formatPeriodDisplay(period)}
            </option>
          ))}
        </Select>
        {/* Status indicator with text */}
        {selectedPeriod && (
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium flex-shrink-0",
            selectedPeriod.is_active && !selectedPeriod.is_closed
              ? "bg-green-100 text-green-700"
              : selectedPeriod.is_closed
              ? "bg-gray-100 text-gray-600"
              : "bg-yellow-100 text-yellow-700"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
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

      {/* Create period dialog */}
      {userIsAdmin && (
        <CreatePayrollPeriodDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            refreshPeriods();
          }}
        />
      )}
    </div>
  );
}

