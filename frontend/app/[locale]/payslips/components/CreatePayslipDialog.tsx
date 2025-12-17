"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface CreatePayslipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePayslipDialog({ open, onOpenChange, onSuccess }: CreatePayslipDialogProps) {
  const router = useRouter();
  const locale = useLocale();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const authHeader = getAuthHeader();
      if (!authHeader) return;

      const response = await fetch(`${API_BASE_URL}/employees?page=1&limit=100`, {
        headers: { Authorization: authHeader },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const employeeList = result.data.map((emp: any) => ({
            id: emp.id,
            name: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.id,
          }));
          setEmployees(employeeList);
        }
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId) {
      alert("אנא בחר עובד");
      return;
    }

    try {
      setCreating(true);
      const authHeader = getAuthHeader();
      if (!authHeader) {
        alert("לא מאומת");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/payslips`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: employeeId,
          month: month,
          year: year,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create payslip");
      }

      if (result.success && result.data?.id) {
        alert(`✅ תלוש שכר נוצר בהצלחה!`);
        onSuccess();
        // Navigate to the new payslip
        router.push(`/${locale}/payslip/${result.data.id}`);
      }
    } catch (err: any) {
      console.error("Error creating payslip:", err);
      alert(`❌ שגיאה: ${err.message || "Unknown error"}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>צור תלוש שכר חדש</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              עובד <span className="text-red-500">*</span>
            </label>
            {loadingEmployees ? (
              <div className="text-sm text-gray-500">טוען עובדים...</div>
            ) : (
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">בחר עובד</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            )}
          </div>

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
                className="h-10"
              />
            </div>
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
            <Button type="submit" disabled={creating || loadingEmployees}>
              {creating ? "יוצר..." : "צור תלוש"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

