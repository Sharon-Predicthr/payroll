"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Employee {
  full_name: string;
  employee_id: string;
  national_id: string;
  address: string;
  employment_start_date: string;
  seniority_years: number;
  job_percentage: number;
  department: string;
  work_center: string;
  position: string;
  grade: string;
  marital_status: string;
  bank_name: string;
  branch_number: string;
  account_number: string;
}

interface EditEmployeeModalProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: Partial<Employee>) => void;
}

export function EditEmployeeModal({
  employee,
  open,
  onOpenChange,
  onSave,
}: EditEmployeeModalProps) {
  const [formData, setFormData] = useState<Partial<Employee>>(employee);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>עריכת פרטי עובד</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שם מלא
              </label>
              <Input
                value={formData.full_name || ""}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                מספר זהות
              </label>
              <Input
                value={formData.national_id || ""}
                onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                כתובת
              </label>
              <Input
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                אחוז משרה
              </label>
              <Input
                type="number"
                value={formData.job_percentage || ""}
                onChange={(e) => setFormData({ ...formData, job_percentage: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                מחלקה
              </label>
              <Input
                value={formData.department || ""}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                מרכז עבודה
              </label>
              <Input
                value={formData.work_center || ""}
                onChange={(e) => setFormData({ ...formData, work_center: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תפקיד
              </label>
              <Input
                value={formData.position || ""}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                דרגה
              </label>
              <Input
                value={formData.grade || ""}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                מצב משפחתי
              </label>
              <Input
                value={formData.marital_status || ""}
                onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שם בנק
              </label>
              <Input
                value={formData.bank_name || ""}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                מספר סניף
              </label>
              <Input
                value={formData.branch_number || ""}
                onChange={(e) => setFormData({ ...formData, branch_number: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                מספר חשבון
              </label>
              <Input
                value={formData.account_number || ""}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit">שמור</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

