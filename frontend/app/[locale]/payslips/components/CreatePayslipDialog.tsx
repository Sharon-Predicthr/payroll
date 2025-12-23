"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAuthHeader } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { usePayrollPeriod } from "@/contexts/PayrollPeriodContext";

const API_BASE_URL = "/api";

interface Employee {
  id: string;
  name: string;
}

interface CreatedPayslip {
  payslip_id: string;
}

interface CreatePayslipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePayslipDialog({ open, onOpenChange, onSuccess }: CreatePayslipDialogProps) {
  const router = useRouter();
  const locale = useLocale();
  const { selectedPeriod } = usePayrollPeriod();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdPayslips, setCreatedPayslips] = useState<string[]>([]);
  const [processMode, setProcessMode] = useState<'single' | 'all'>('single');
  
  const [employeeId, setEmployeeId] = useState("");

  useEffect(() => {
    if (open) {
      fetchEmployees();
      setCreatedPayslips([]);
      setProcessMode('single');
      setEmployeeId("");
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const authHeader = getAuthHeader();
      if (!authHeader) return;

      const response = await fetch(`${API_BASE_URL}/employees?page=1&limit=1000`, {
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

    if (!selectedPeriod) {
      alert("אנא בחר תקופת שכר בראש הדף");
      return;
    }

    if (processMode === 'single' && !employeeId) {
      alert("אנא בחר עובד");
      return;
    }

    try {
      setCreating(true);
      setCreatedPayslips([]);
      const authHeader = getAuthHeader();
      if (!authHeader) {
        alert("לא מאומת");
        return;
      }

      const requestBody: any = {
        period_id: selectedPeriod.period_id,
      };

      if (processMode === 'single') {
        requestBody.employee_id = employeeId;
      } else {
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to process payroll");
      }

      if (result.success && result.data) {
        const payslipIds: string[] = [];
        
        if (result.data.payslip_id) {
          payslipIds.push(result.data.payslip_id);
        } else if (result.data.payslip_ids && result.data.payslip_ids.length > 0) {
          payslipIds.push(...result.data.payslip_ids);
        }

        setCreatedPayslips(payslipIds);
        
        if (payslipIds.length === 1) {
          // Single payslip - auto navigate after a short delay
          setTimeout(() => {
            router.push(`/${locale}/payslip/${payslipIds[0]}`);
            onSuccess();
            onOpenChange(false);
          }, 1500);
        } else {
          // Multiple payslips - show success message
          alert(`✅ ${result.data.processed} תלושי שכר נוצרו בהצלחה!`);
        }
      }
    } catch (err: any) {
      console.error("Error processing payroll:", err);
      alert(`❌ שגיאה: ${err.message || "Unknown error"}`);
    } finally {
      setCreating(false);
    }
  };

  const handleViewPayslip = (payslipId: string) => {
    router.push(`/${locale}/payslip/${payslipId}`);
    onSuccess();
    onOpenChange(false);
  };

  const handleViewAll = () => {
    router.push(`/${locale}/payslips`);
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>צור תלושי שכר</DialogTitle>
        </DialogHeader>

        {createdPayslips.length === 0 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תקופת שכר
              </label>
              <div className="p-3 bg-gray-50 rounded-md text-sm">
                {selectedPeriod ? (
                  <div>
                    <div className="font-medium">{selectedPeriod.period_description}</div>
                    <div className="text-gray-600 text-xs mt-1">
                      {new Date(selectedPeriod.period_start_date).toLocaleDateString('he-IL')} - {new Date(selectedPeriod.period_end_date).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                ) : (
                  <div className="text-red-600">אנא בחר תקופת שכר בראש הדף</div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                מצב עיבוד
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
                  <input
                    type="radio"
                    name="processMode"
                    value="single"
                    checked={processMode === 'single'}
                    onChange={(e) => setProcessMode(e.target.value as 'single' | 'all')}
                    className="form-radio"
                  />
                  <span>עובד יחיד</span>
                </label>
                <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
                  <input
                    type="radio"
                    name="processMode"
                    value="all"
                    checked={processMode === 'all'}
                    onChange={(e) => setProcessMode(e.target.value as 'single' | 'all')}
                    className="form-radio"
                  />
                  <span>כל העובדים</span>
                </label>
              </div>
            </div>

            {processMode === 'single' && (
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
                    required={processMode === 'single'}
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
              <Button type="submit" disabled={creating || loadingEmployees || !selectedPeriod}>
                {creating ? "מעבד..." : "צור תלושים"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-900 mb-2">
                ✅ תלושי שכר נוצרו בהצלחה!
              </div>
              <div className="text-sm text-green-700">
                נוצרו {createdPayslips.length} תלושי שכר
              </div>
            </div>

            {createdPayslips.length <= 5 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">תלושים שנוצרו:</div>
                {createdPayslips.map((payslipId) => (
                  <div
                    key={payslipId}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                  >
                    <span className="text-sm text-gray-700">{payslipId}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPayslip(payslipId)}
                      className="h-8 px-2 text-xs"
                    >
                      צפה
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                נוצרו {createdPayslips.length} תלושי שכר. תוכל לראות אותם בדף תלושי שכר.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  onSuccess();
                  onOpenChange(false);
                }}
              >
                סגור
              </Button>
              {createdPayslips.length > 5 && (
                <Button onClick={handleViewAll}>
                  צפה בכל התלושים
                </Button>
              )}
              {createdPayslips.length === 1 && (
                <Button onClick={() => handleViewPayslip(createdPayslips[0])}>
                  צפה בתלוש
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
