"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthHeader } from "@/lib/auth";
import { usePayrollPeriod } from "@/contexts/PayrollPeriodContext";

interface CreatePayrollPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreatePayrollPeriodDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePayrollPeriodDialogProps) {
  const { refreshPeriods } = usePayrollPeriod();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields based on xlg_pay_periods table:
  // client_id (auto), period_id, start_date, end_date, pay_date, tax_year, is_closed
  const [periodId, setPeriodId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [payDate, setPayDate] = useState("");
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [isClosed, setIsClosed] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      setPeriodId(`${year}-${month}`);
      setStartDate("");
      setEndDate("");
      setPayDate("");
      setTaxYear(year);
      setIsClosed(false);
      setError(null);
    }
  }, [open]);

  // Auto-generate period_id from start_date
  useEffect(() => {
    if (startDate) {
      const date = new Date(startDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      setPeriodId(`${year}-${month}`);
      setTaxYear(year);
    }
  }, [startDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!periodId || !startDate || !endDate) {
      setError("אנא מלא את כל השדות הנדרשים");
      return;
    }

    // Validate period_id format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(periodId)) {
      setError("פורמט תקופת שכר לא תקין. נדרש: YYYY-MM (לדוגמה: 2025-02)");
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      setError("תאריך סיום חייב להיות אחרי תאריך התחלה");
      return;
    }

    try {
      setCreating(true);

      const authHeader = getAuthHeader();
      if (!authHeader) {
        setError("לא מאומת - אנא התחבר מחדש");
        return;
      }

      const requestBody: any = {
        period_id: periodId,
        start_date: startDate,
        end_date: endDate,
        tax_year: taxYear,
        is_closed: isClosed,
      };

      if (payDate) {
        requestBody.pay_date = payDate;
      }

      const response = await fetch("/api/payroll-periods", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create payroll period");
      }

      // Refresh periods list
      await refreshPeriods();

      if (onSuccess) {
        onSuccess();
      }

      onOpenChange(false);
    } catch (err: any) {
      console.error("Error creating payroll period:", err);
      setError(err.message || "שגיאה ביצירת תקופת שכר");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogClose />
        <DialogHeader>
          <DialogTitle>צור תקופת שכר חדשה</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תקופת שכר (YYYY-MM) <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              placeholder="2025-02"
              pattern="\d{4}-\d{2}"
              required
              disabled={creating}
              className="h-10"
            />
            <p className="text-xs text-gray-500 mt-1">
              פורמט: YYYY-MM (לדוגמה: 2025-02)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תאריך התחלה <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              disabled={creating}
              className="h-10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תאריך סיום <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              disabled={creating}
              className="h-10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תאריך תשלום
            </label>
            <Input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              disabled={creating}
              className="h-10"
            />
            <p className="text-xs text-gray-500 mt-1">
              אופציונלי - תאריך תשלום השכר
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שנת מס
            </label>
            <Input
              type="number"
              value={taxYear}
              onChange={(e) => setTaxYear(parseInt(e.target.value) || new Date().getFullYear())}
              min="2000"
              max="2100"
              disabled={creating}
              className="h-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isClosed"
              checked={isClosed}
              onChange={(e) => setIsClosed(e.target.checked)}
              disabled={creating}
              className="h-4 w-4"
            />
            <label htmlFor="isClosed" className="text-sm text-gray-700 cursor-pointer">
              תקופה סגורה
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "יוצר..." : "צור תקופה"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

