"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDirection } from "@/contexts/DirectionContext";
import { useTranslations } from 'next-intl';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  status: "Active" | "Inactive" | "On Leave";
  country: string;
  employmentType: "Full-time" | "Part-time" | "Contract";
  avatar?: string;
}

interface EmployeeDetailData {
  id: string;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  department_id?: string;
  position?: string;
  status?: string;
  hire_date?: Date;
  bank_details?: any[];
  pay_items?: any[];
  pension_profile?: any;
  tax_profile?: any;
  attendance?: any[];
  contracts?: any[];
  leave_balances?: any[];
}

interface EmployeeDetailProps {
  employee: Employee | null;
  employeeDetail?: EmployeeDetailData | null;
  onSave?: () => void;
  onTerminate?: (employeeId: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700";
    case "Inactive":
      return "bg-gray-100 text-gray-700";
    case "On Leave":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function EmployeeDetail({ employee, employeeDetail, onSave, onTerminate }: EmployeeDetailProps) {
  const { direction } = useDirection();
  const t = useTranslations('employees');
  const tCommon = useTranslations('common');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const handleSave = () => {
    setIsEditing(false);
    if (onSave) {
      onSave();
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (!employee) {
    return (
      <div className="flex-1 bg-white overflow-y-auto flex items-center justify-center">
        <p className="text-gray-500">{t('selectEmployee')}</p>
      </div>
    );
  }

  // Component will render even if employeeDetail is null/undefined
  // All fields use optional chaining (employeeDetail?.field || "N/A")
  
  return (
    <div className="bg-card-bg rounded-xl shadow-sm border border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        {/* Detail Header - Compact */}
        <div className="border-b border-gray-200 pb-3 mb-3 sticky top-0 bg-white z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-lg font-semibold flex-shrink-0">
                {getInitials(employee.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-text-main truncate">{employee.name}</h2>
                <p className="text-xs text-text-muted mt-0.5 truncate">{employee.position}</p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(employee.status)}`}
                  >
                    {employee.status}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-text-muted">
                    {employee.employmentType}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-text-muted">
                    {employee.department}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleSave}
                    className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs"
                  >
                    {tCommon('save')}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="h-8 px-3 text-xs"
                  >
                    {tCommon('cancel')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    className="h-8 px-2.5 text-xs"
                  >
                    <svg className="w-3.5 h-3.5 mr-1.5 rtl:mr-0 rtl:ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    {tCommon('edit')}
                  </Button>
                  <Button variant="outline" className="h-8 px-2.5 text-xs">
                    <svg className="w-3.5 h-3.5 mr-1.5 rtl:mr-0 rtl:ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    {t('actions.payslip')}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-8 px-2.5 text-xs text-red-600 hover:text-red-700 hover:border-red-300"
                    onClick={() => onTerminate && employee && onTerminate(employee.id)}
                  >
                    <svg className="w-3.5 h-3.5 mr-1.5 rtl:mr-0 rtl:ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                    {t('actions.terminate')}
                  </Button>
                  <Button variant="outline" className="h-8 px-2.5 text-xs">
                    <svg className="w-3.5 h-3.5 mr-1.5 rtl:mr-0 rtl:ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                    {t('actions.ai')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs - Compact */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-3 h-9">
            <TabsTrigger value="overview" className="px-3 py-1 text-xs">{t('tabs.overview')}</TabsTrigger>
            <TabsTrigger value="personal" className="px-3 py-1 text-xs">{t('tabs.personal')}</TabsTrigger>
            <TabsTrigger value="employment" className="px-3 py-1 text-xs">{t('tabs.employment')}</TabsTrigger>
            <TabsTrigger value="payroll" className="px-3 py-1 text-xs">{t('tabs.payroll')}</TabsTrigger>
            <TabsTrigger value="time" className="px-3 py-1 text-xs">{t('tabs.timeAttendance')}</TabsTrigger>
            <TabsTrigger value="benefits" className="px-3 py-1 text-xs">{t('tabs.benefits')}</TabsTrigger>
            <TabsTrigger value="documents" className="px-3 py-1 text-xs">{t('tabs.documents')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab - Compact Grid */}
          <TabsContent value="overview" className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border border-gray-200 rounded-lg">
                <p className="text-xs text-text-muted mb-1">{t('fields.employeeId')}</p>
                <p className="text-sm font-medium text-text-main">{employee.id}</p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg">
                <p className="text-xs text-text-muted mb-1">{t('email')}</p>
                <p className="text-sm font-medium text-text-main truncate">{employee.email}</p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg">
                <p className="text-xs text-text-muted mb-1">{t('department')}</p>
                <p className="text-sm font-medium text-text-main">{employee.department}</p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg">
                <p className="text-xs text-text-muted mb-1">{t('position')}</p>
                <p className="text-sm font-medium text-text-main">{employee.position}</p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg">
                <p className="text-xs text-text-muted mb-1">{t('status')}</p>
                <p className="text-sm font-medium text-text-main">{employee.status}</p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg">
                <p className="text-xs text-text-muted mb-1">{t('employmentType')}</p>
                <p className="text-sm font-medium text-text-main">{employee.employmentType}</p>
              </div>
            </div>
          </TabsContent>

          {/* Personal Tab - Compact Grid */}
          <TabsContent value="personal" className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.firstName')}</label>
                {isEditing ? (
                  <Input defaultValue={employee.name.split(" ")[0]} className="h-8 text-sm" />
                ) : (
                  <p className="text-sm text-text-main py-1.5">{employee.name.split(" ")[0]}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.lastName')}</label>
                {isEditing ? (
                  <Input defaultValue={employee.name.split(" ")[1] || ""} className="h-8 text-sm" />
                ) : (
                  <p className="text-sm text-text-main py-1.5">
                    {employee.name.split(" ").slice(1).join(" ") || "N/A"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('email')}</label>
                {isEditing ? (
                  <Input type="email" defaultValue={employee.email} className="h-8 text-sm" />
                ) : (
                  <p className="text-sm text-text-main py-1.5 truncate">{employee.email}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('phone')}</label>
                {isEditing ? (
                  <Input type="tel" defaultValue={employeeDetail?.phone || ""} className="h-8 text-sm" />
                ) : (
                  <p className="text-sm text-text-main py-1.5">{employeeDetail?.phone || "N/A"}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.dateOfBirth')}</label>
                {isEditing ? (
                  <Input type="date" defaultValue="1990-01-15" className="h-8 text-sm" />
                ) : (
                  <p className="text-sm text-text-main py-1.5">January 15, 1990</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('country')}</label>
                {isEditing ? (
                  <Input defaultValue={employee.country} className="h-8 text-sm" />
                ) : (
                  <p className="text-sm text-text-main py-1.5">{employee.country}</p>
                )}
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.address')}</label>
                {isEditing ? (
                  <Input defaultValue="123 Main Street, City, State 12345" className="h-8 text-sm" />
                ) : (
                  <p className="text-sm text-text-main py-1.5">123 Main Street, City, State 12345</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Employment Tab - Compact */}
          <TabsContent value="employment" className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('hireDate')}</label>
                {isEditing ? (
                  <Input 
                    type="date" 
                    defaultValue={employeeDetail?.hire_date ? new Date(employeeDetail.hire_date).toISOString().split('T')[0] : ""} 
                    className="h-8 text-sm" 
                  />
                ) : (
                  <p className="text-sm text-text-main py-1.5">
                    {employeeDetail?.hire_date 
                      ? new Date(employeeDetail.hire_date).toLocaleDateString() 
                      : "N/A"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('department')}</label>
                {isEditing ? (
                  <Select defaultValue={employee.department} className="h-8 text-sm">
                    <option>Engineering</option>
                    <option>Marketing</option>
                    <option>Sales</option>
                    <option>HR</option>
                  </Select>
                ) : (
                  <p className="text-sm text-text-main py-1.5">{employee.department}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('position')}</label>
                {isEditing ? (
                  <Input defaultValue={employee.position} className="h-8 text-sm" />
                ) : (
                  <p className="text-sm text-text-main py-1.5">{employee.position}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  {t('employmentType')}
                </label>
                {isEditing ? (
                  <Select defaultValue={employee.employmentType} className="h-8 text-sm">
                    <option>{t('employmentTypes.fullTime')}</option>
                    <option>{t('employmentTypes.partTime')}</option>
                    <option>{t('employmentTypes.contract')}</option>
                  </Select>
                ) : (
                  <p className="text-sm text-text-main py-1.5">{employee.employmentType}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.manager')}</label>
                {isEditing ? (
                  <Input defaultValue="Jane Manager" className="h-8 text-sm" />
                ) : (
                  <p className="text-sm text-text-main py-1.5">Jane Manager</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.workLocation')}</label>
                {isEditing ? (
                  <Input defaultValue="New York Office" className="h-8 text-sm" />
                ) : (
                  <p className="text-sm text-text-main py-1.5">New York Office</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Payroll Tab - Compact */}
          <TabsContent value="payroll" className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.baseSalary')}</label>
                {isEditing ? (
                  <Input type="number" defaultValue="75000" className="h-8 text-sm" />
                ) : (
                  <p className="text-sm text-text-main py-1.5">$75,000.00</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.payFrequency')}</label>
                {isEditing ? (
                  <Select defaultValue="Monthly" className="h-8 text-sm">
                    <option>Monthly</option>
                    <option>Bi-weekly</option>
                    <option>Weekly</option>
                  </Select>
                ) : (
                  <p className="text-sm text-text-main py-1.5">Monthly</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.bankAccount')}</label>
                {isEditing ? (
                  <Input defaultValue="****1234" className="h-8 text-sm" />
                ) : (
                  <p className="text-sm text-text-main py-1.5">****1234</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.taxId')}</label>
                {isEditing ? (
                  <Input defaultValue="TAX-12345" className="h-8 text-sm" />
                ) : (
                  <p className="text-sm text-text-main py-1.5">TAX-12345</p>
                )}
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-semibold text-text-main mb-2">{t('fields.payItems')}</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {employeeDetail?.pay_items && employeeDetail.pay_items.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                          {t('fields.item')}
                        </th>
                        <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                          {t('fields.type')}
                        </th>
                        <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                          {t('fields.amount')}
                        </th>
                        <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                          {t('status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {employeeDetail.pay_items.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-sm text-text-main">{item.item_name || "N/A"}</td>
                          <td className="px-3 py-2 text-sm text-text-muted">{item.pay_item_type || "N/A"}</td>
                          <td className="px-3 py-2 text-sm text-text-main">
                            {item.amount !== null && item.amount !== undefined 
                              ? `$${Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : "N/A"}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                            }`}>
                              {item.is_active ? t('status.active') : t('status.inactive')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-center text-sm text-text-muted">
                    {t('emptyStates.noPayItems')}
                  </div>
                )}
              </div>
            </div>
            
            {/* Bank Details */}
            {employeeDetail?.bank_details && employeeDetail.bank_details.length > 0 && (
              <div className="mt-3">
                <h3 className="text-sm font-semibold text-text-main mb-2">{t('fields.bankDetails')}</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                          {t('fields.bankName')}
                        </th>
                        <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                          {t('fields.accountNumber')}
                        </th>
                        <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                          {t('fields.branchCode')}
                        </th>
                        <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                          {t('fields.type')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {employeeDetail.bank_details.map((bank: any) => (
                        <tr key={bank.id}>
                          <td className="px-3 py-2 text-sm text-text-main">{bank.bank_name || "N/A"}</td>
                          <td className="px-3 py-2 text-sm text-text-main">{bank.account_number || "N/A"}</td>
                          <td className="px-3 py-2 text-sm text-text-muted">{bank.branch_code || "N/A"}</td>
                          <td className="px-3 py-2 text-sm text-text-muted">
                            {bank.account_type || "N/A"}
                            {bank.is_primary && (
                              <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{t('fields.primary')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Tax Profile */}
            {employeeDetail?.tax_profile && (
              <div className="mt-3">
                <h3 className="text-sm font-semibold text-text-main mb-2">{t('fields.taxProfile')}</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.taxId')}</label>
                    <p className="text-sm text-text-main py-1.5">{employeeDetail.tax_profile.tax_id || "N/A"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.filingStatus')}</label>
                    <p className="text-sm text-text-main py-1.5">{employeeDetail.tax_profile.filing_status || "N/A"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.exemptions')}</label>
                    <p className="text-sm text-text-main py-1.5">{employeeDetail.tax_profile.exemptions ?? "N/A"}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Pension Profile */}
            {employeeDetail?.pension_profile && (
              <div className="mt-3">
                <h3 className="text-sm font-semibold text-text-main mb-2">{t('fields.pensionProfile')}</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.provider')}</label>
                    <p className="text-sm text-text-main py-1.5">{employeeDetail.pension_profile.pension_provider || "N/A"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.pensionNumber')}</label>
                    <p className="text-sm text-text-main py-1.5">{employeeDetail.pension_profile.pension_number || "N/A"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">{t('fields.contributionRate')}</label>
                    <p className="text-sm text-text-main py-1.5">
                      {employeeDetail.pension_profile.contribution_rate !== null && employeeDetail.pension_profile.contribution_rate !== undefined
                        ? `${Number(employeeDetail.pension_profile.contribution_rate)}%`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Time & Attendance Tab - Compact */}
          <TabsContent value="time" className="space-y-3">
            {/* Attendance Records */}
            {employeeDetail?.attendance && employeeDetail.attendance.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                        {t('fields.date')}
                      </th>
                      <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                        {t('fields.checkIn')}
                      </th>
                      <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                        {t('fields.checkOut')}
                      </th>
                      <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                        {t('fields.hours')}
                      </th>
                      <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                        {t('status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {employeeDetail.attendance.map((record: any) => (
                      <tr key={record.id}>
                        <td className="px-3 py-2 text-sm text-text-main">
                          {record.date ? new Date(record.date).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="px-3 py-2 text-sm text-text-main">
                          {record.check_in ? new Date(record.check_in).toLocaleTimeString() : "N/A"}
                        </td>
                        <td className="px-3 py-2 text-sm text-text-main">
                          {record.check_out ? new Date(record.check_out).toLocaleTimeString() : "N/A"}
                        </td>
                        <td className="px-3 py-2 text-sm text-text-main">
                          {record.hours_worked !== null && record.hours_worked !== undefined 
                            ? `${Number(record.hours_worked).toFixed(2)}h`
                            : "N/A"}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            record.status === "Present" ? "bg-green-100 text-green-700" :
                            record.status === "Absent" ? "bg-red-100 text-red-700" :
                            record.status === "Late" ? "bg-orange-100 text-orange-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {record.status === "Present" ? t('fields.present') :
                             record.status === "Absent" ? t('fields.absent') :
                             record.status === "Late" ? t('fields.late') :
                             record.status || "N/A"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-text-muted border border-gray-200 rounded-lg">
                {t('emptyStates.noAttendance')}
              </div>
            )}
            
            {/* Leave Balances */}
            {employeeDetail?.leave_balances && employeeDetail.leave_balances.length > 0 && (
              <div className="mt-3">
                <h3 className="text-sm font-semibold text-text-main mb-2">{t('fields.leaveBalances')}</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                          {t('fields.leaveType')}
                        </th>
                        <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                          {t('fields.year')}
                        </th>
                        <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                          {t('fields.balance')}
                        </th>
                        <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                          {t('fields.used')}
                        </th>
                        <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                          {t('fields.available')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {employeeDetail.leave_balances.map((balance: any) => (
                        <tr key={balance.id}>
                          <td className="px-3 py-2 text-sm text-text-main">{balance.leave_type || "N/A"}</td>
                          <td className="px-3 py-2 text-sm text-text-main">{balance.year || "N/A"}</td>
                          <td className="px-3 py-2 text-sm text-text-main">{balance.balance ?? "N/A"}</td>
                          <td className="px-3 py-2 text-sm text-text-main">{balance.used ?? "N/A"}</td>
                          <td className="px-3 py-2 text-sm text-text-main">{balance.available ?? "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Benefits Tab - Compact */}
          <TabsContent value="benefits" className="space-y-2">
            {employeeDetail?.pension_profile ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-text-main mb-1">{t('fields.pensionPlan')}</h4>
                  <p className="text-xs text-text-muted">
                    {employeeDetail.pension_profile.pension_provider || "N/A"}
                    {employeeDetail.pension_profile.contribution_rate !== null && employeeDetail.pension_profile.contribution_rate !== undefined
                      ? ` - ${Number(employeeDetail.pension_profile.contribution_rate)}% contribution`
                      : ""}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-text-muted border border-gray-200 rounded-lg">
                {t('emptyStates.noPensionProfile')}
              </div>
            )}
          </TabsContent>

          {/* Documents & History Tab - Compact */}
          <TabsContent value="documents" className="space-y-2">
            {/* Contracts */}
            {employeeDetail?.contracts && employeeDetail.contracts.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-text-main mb-2">{t('fields.contracts')}</h3>
                {employeeDetail.contracts.map((contract: any) => (
                  <div key={contract.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-main truncate">
                        {contract.contract_type || t('fields.contracts')}
                      </p>
                      <p className="text-xs text-text-muted">
                        {contract.start_date 
                          ? `${t('fields.started')}: ${new Date(contract.start_date).toLocaleDateString()}`
                          : ""}
                        {contract.end_date 
                          ? ` - ${t('fields.ends')}: ${new Date(contract.end_date).toLocaleDateString()}`
                          : ""}
                        {contract.salary !== null && contract.salary !== undefined
                          ? ` - ${t('fields.salary')}: $${Number(contract.salary).toLocaleString()}`
                          : ""}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {t('status')}: <span className={`${
                          contract.status === "Active" ? "text-green-600" : "text-gray-600"
                        }`}>{contract.status || "N/A"}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-text-muted border border-gray-200 rounded-lg">
                {t('emptyStates.noContracts')}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

