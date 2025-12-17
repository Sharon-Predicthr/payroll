"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { EditEmployeeModal } from "./EditEmployeeModal";

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

interface EmployeeDetailsCardProps {
  employee: Employee;
  canEdit: boolean;
  onEdit: (updated: Partial<Employee>) => void;
}

export function EmployeeDetailsCard({ employee, canEdit, onEdit }: EmployeeDetailsCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("he-IL");
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">פרטי עובד</h2>
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 h-8 px-3 text-xs"
            >
              <Edit className="w-4 h-4" />
              ערוך
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">שם מלא</label>
            <p className="text-base text-gray-900 mt-1">{employee.full_name}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">תעודת זהות</label>
            <p className="text-base text-gray-900 mt-1">{employee.employee_id}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">מספר זהות</label>
            <p className="text-base text-gray-900 mt-1">{employee.national_id}</p>
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <label className="text-sm font-medium text-gray-500">כתובת</label>
            <p className="text-base text-gray-900 mt-1">{employee.address}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">תאריך תחילת עבודה</label>
            <p className="text-base text-gray-900 mt-1">{formatDate(employee.employment_start_date)}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">ותק</label>
            <p className="text-base text-gray-900 mt-1">{employee.seniority_years} שנים</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">אחוז משרה</label>
            <p className="text-base text-gray-900 mt-1">{employee.job_percentage}%</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">מחלקה</label>
            <p className="text-base text-gray-900 mt-1">{employee.department}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">מרכז עבודה</label>
            <p className="text-base text-gray-900 mt-1">{employee.work_center}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">תפקיד / דרגה</label>
            <p className="text-base text-gray-900 mt-1">{employee.position} {employee.grade && `(${employee.grade})`}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">מצב משפחתי</label>
            <p className="text-base text-gray-900 mt-1">{employee.marital_status}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">שם בנק</label>
            <p className="text-base text-gray-900 mt-1">{employee.bank_name}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">מספר סניף</label>
            <p className="text-base text-gray-900 mt-1">{employee.branch_number}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">מספר חשבון</label>
            <p className="text-base text-gray-900 mt-1">{employee.account_number}</p>
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditEmployeeModal
          employee={employee}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onSave={onEdit}
        />
      )}
    </>
  );
}

