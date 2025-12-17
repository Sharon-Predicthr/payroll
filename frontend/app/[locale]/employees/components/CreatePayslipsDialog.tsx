"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthHeader } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

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
  const [scope, setScope] = useState<PayslipScope>("selected");
  const [singleEmployeeId, setSingleEmployeeId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setScope(selectedEmployees.length > 0 ? "selected" : "all");
      setSingleEmployeeId("");
      setMonth(new Date().getMonth() + 1);
      setYear(new Date().getFullYear());
      setCreating(false);
      setProgress({ current: 0, total: 0 });
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

    const targetEmployees = getTargetEmployees();
    if (targetEmployees.length === 0) {
      alert("אנא בחר עובדים");
      return;
    }

    try {
      setCreating(true);
      setProgress({ current: 0, total: targetEmployees.length });

      const authHeader = getAuthHeader();
      if (!authHeader) {
        alert("לא מאומת");
        return;
      }

      const createdPayslips: string[] = [];
      const errors: string[] = [];

      for (let i = 0; i < targetEmployees.length; i++) {
        const employee = targetEmployees[i];
        setProgress({ current: i + 1, total: targetEmployees.length });

        try {
          const response = await fetch(`${API_BASE_URL}/payslips`, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              employee_id: employee.id,
              month: month,
              year: year,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.message || "Failed to create payslip");
          }

          if (result.success && result.data?.id) {
            createdPayslips.push(result.data.id);
          }
        } catch (err: any) {
          errors.push(`${employee.name}: ${err.message}`);
        }
      }

      setCreating(false);

      if (createdPayslips.length > 0) {
        alert(`✅ נוצרו ${createdPayslips.length} תלושי שכר בהצלחה!`);
        if (errors.length > 0) {
          alert(`⚠️ שגיאות: ${errors.join("\n")}`);
        }
        onSuccess();
        onOpenChange(false);
        
        // Navigate to payslips page
        router.push(`/${locale}/payslips`);
      } else {
        alert(`❌ שגיאה: לא נוצרו תלושי שכר.\n${errors.join("\n")}`);
      }
    } catch (err: any) {
      console.error("Error creating payslips:", err);
      alert(`❌ שגיאה: ${err.message || "Unknown error"}`);
      setCreating(false);
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
                  disabled={creating || selectedEmployees.length === 0}
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
                  disabled={creating}
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
                  disabled={creating}
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
                disabled={creating}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                חודש <span className="text-red-500">*</span>
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={creating}
              >
                <option value="1">ינואר</option>
                <option value="2">פברואר</option>
                <option value="3">מרץ</option>
                <option value="4">אפריל</option>
                <option value="5">מאי</option>
                <option value="6">יוני</option>
                <option value="7">יולי</option>
                <option value="8">אוגוסט</option>
                <option value="9">ספטמבר</option>
                <option value="10">אוקטובר</option>
                <option value="11">נובמבר</option>
                <option value="12">דצמבר</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שנה <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                min="2000"
                max="2100"
                required
                disabled={creating}
                className="h-10"
              />
            </div>
          </div>

          {creating && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-700">
                  יוצר תלושי שכר... ({progress.current}/{progress.total})
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

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
              {creating ? "יוצר..." : `צור תלושי שכר (${getTargetEmployees().length})`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

