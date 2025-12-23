"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthHeader } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { usePayrollPeriod } from "@/contexts/PayrollPeriodContext";

const API_BASE_URL = "/api";

interface Employee {
  id: string;
  name: string;
}

interface CreatePayslipsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmployees: Employee[];
  allEmployees: Employee[];
  onSuccess: () => void;
}

type PayslipScope = "selected" | "all" | "single";

export function CreatePayslipsDialog({
  open,
  onOpenChange,
  selectedEmployees,
  allEmployees,
  onSuccess,
}: CreatePayslipsDialogProps) {
  const router = useRouter();
  const locale = useLocale();
  const { selectedPeriod } = usePayrollPeriod();
  const [scope, setScope] = useState<PayslipScope>("selected");
  const [singleEmployeeId, setSingleEmployeeId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ processed: number; failed: number; errors: string[] } | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setScope(selectedEmployees.length > 0 ? "selected" : "all");
      setSingleEmployeeId("");
      setProcessing(false);
      setResult(null);
    }
  }, [open, selectedEmployees.length]);

  const getTargetEmployees = (): Employee[] => {
    if (scope === "single") {
      if (!singleEmployeeId) return [];
      const emp = allEmployees.find(e => e.id === singleEmployeeId);
      return emp ? [emp] : [];
    }
    if (scope === "selected") {
      return selectedEmployees;
    }
    return allEmployees;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPeriod) {
      alert("אנא בחר תקופת שכר");
      return;
    }

    const targetEmployees = getTargetEmployees();
    if (targetEmployees.length === 0) {
      alert("אנא בחר עובדים");
      return;
    }

    try {
      setProcessing(true);
      setResult(null);

      const authHeader = getAuthHeader();
      if (!authHeader) {
        alert("לא מאומת");
        return;
      }

      // Prepare request body based on scope
      let requestBody: any = {
        period_id: selectedPeriod.period_id,
      };

      if (scope === "single" && singleEmployeeId) {
        requestBody.employee_id = singleEmployeeId;
      } else if (scope === "selected" && selectedEmployees.length > 0) {
        requestBody.employee_ids = selectedEmployees.map(e => e.id);
      } else if (scope === "all") {
        requestBody.process_all = true;
      }

      const response = await fetch(`${API_BASE_URL}/payslips/process`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to process payroll");
      }

      if (data.success && data.data) {
        setResult(data.data);
        
        if (data.data.processed > 0) {
          // Refresh payslips list after a short delay
          setTimeout(() => {
            onSuccess();
            // Navigate to payslips page to see the created payslips
            router.push(`/${locale}/payslips`);
          }, 1000);
        }
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err: any) {
      console.error("Error processing payroll:", err);
      alert(`❌ שגיאה: ${err.message || "Unknown error"}`);
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogClose />
        <DialogHeader>
          <DialogTitle>צור תלושי שכר</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!selectedPeriod && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-700">
                ⚠️ אנא בחר תקופת שכר בראש הדף
              </p>
            </div>
          )}

          {selectedPeriod && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                תקופת שכר: <strong>{selectedPeriod.period_description}</strong>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              טווח עובדים <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="selected"
                  checked={scope === "selected"}
                  onChange={(e) => setScope(e.target.value as PayslipScope)}
                  disabled={processing || selectedEmployees.length === 0}
                  className="h-4 w-4"
                />
                <span className="text-sm">
                  עובדים נבחרים ({selectedEmployees.length})
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="single"
                  checked={scope === "single"}
                  onChange={(e) => setScope(e.target.value as PayslipScope)}
                  disabled={processing}
                  className="h-4 w-4"
                />
                <span className="text-sm">עובד יחיד</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="all"
                  checked={scope === "all"}
                  onChange={(e) => setScope(e.target.value as PayslipScope)}
                  disabled={processing}
                  className="h-4 w-4"
                />
                <span className="text-sm">
                  כל העובדים ({allEmployees.length})
                </span>
              </label>
            </div>
          </div>

          {scope === "single" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                עובד <span className="text-red-500">*</span>
              </label>
              <select
                value={singleEmployeeId}
                onChange={(e) => setSingleEmployeeId(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={processing}
              >
                <option value="">בחר עובד</option>
                {allEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {processing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-700">
                  מעבד שכר...
                </span>
              </div>
            </div>
          )}

          {result && (
            <div className={`border rounded-lg p-3 ${result.failed > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
              <p className="text-sm font-medium mb-2">
                {result.failed > 0 ? '⚠️ עיבוד הושלם עם שגיאות' : '✅ עיבוד הושלם בהצלחה'}
              </p>
              <p className="text-sm mb-1">
                עובדים שעובדו: <strong>{result.processed}</strong>
              </p>
              {result.failed > 0 && (
                <>
                  <p className="text-sm mb-2">
                    עובדים שנכשלו: <strong>{result.failed}</strong>
                  </p>
                  {result.errors.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      <p className="text-xs font-medium mb-1">שגיאות:</p>
                      <ul className="text-xs list-disc list-inside space-y-1">
                        {result.errors.slice(0, 5).map((error, idx) => (
                          <li key={idx} className="text-yellow-700">{error}</li>
                        ))}
                        {result.errors.length > 5 && (
                          <li className="text-yellow-600">ועוד {result.errors.length - 5} שגיאות...</li>
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setResult(null);
              }}
              disabled={processing}
            >
              {result ? "סגור" : "ביטול"}
            </Button>
            {!result && (
              <Button type="submit" disabled={processing || !selectedPeriod}>
                {processing ? "מעבד..." : `עבד שכר (${getTargetEmployees().length})`}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

