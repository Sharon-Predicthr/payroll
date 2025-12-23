"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDirection } from "@/contexts/DirectionContext";
import { useTranslations } from 'next-intl';
import { EditableFields, EditableField } from "@/components/EditableFields";
import { EditableTable } from "@/components/EditableTable";
import { LookupSelect } from "@/components/LookupSelect";
import { LookupGridSelect } from "@/components/LookupGridSelect/LookupGridSelect";
import { useEmployeeSave, EmployeeChanges } from "@/hooks/useEmployeeSave";
import { usePayrollPeriod } from "@/contexts/PayrollPeriodContext";
import { formatDateOnly, parseDateOnly } from "@/lib/dateUtils";

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
  const router = useRouter();
  const locale = useLocale();
  const { direction } = useDirection();
  const { selectedPeriod } = usePayrollPeriod();
  const t = useTranslations('employees');
  const tCommon = useTranslations('common');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [employeeData, setEmployeeData] = useState<Record<string, any>>({});
  const [loadingPayslip, setLoadingPayslip] = useState(false);
  
  // Track changes for each tab
  const [masterChanges, setMasterChanges] = useState<Record<string, any>>({});
  const [taxChanges, setTaxChanges] = useState<Record<string, any>>({});
  const [savedTaxValues, setSavedTaxValues] = useState<Record<string, any>>({}); // Store saved values until employeeDetail refreshes
  const [contractsChanges, setContractsChanges] = useState<{ created?: any[]; updated?: any[]; deleted?: (number | string)[] }>({});
  const [attendanceChanges, setAttendanceChanges] = useState<{ created?: any[]; updated?: any[]; deleted?: (number | string)[] }>({});
  const [bankDetailsChanges, setBankDetailsChanges] = useState<{ created?: any[]; updated?: any[]; deleted?: (number | string)[] }>({});
  const [pensionChanges, setPensionChanges] = useState<{ created?: any[]; updated?: any[]; deleted?: (number | string)[] }>({});
  const [payItemsChanges, setPayItemsChanges] = useState<{ created?: any[]; updated?: any[]; deleted?: (number | string)[] }>({});
  
  // Use the save hook
  const { saveAll, isSaving, saveError, clearError } = useEmployeeSave(employee?.id);

  // Clear savedTaxValues when employeeDetail refreshes (after save)
  useEffect(() => {
    if (employeeDetail && Object.keys(savedTaxValues).length > 0) {
      // Check if the saved values match the new employeeDetail
      // If they match, clear savedTaxValues (data has been refreshed)
      const allMatch = Object.keys(savedTaxValues).every(key => {
        const savedValue = savedTaxValues[key];
        const currentValue = employeeDetail.tax_profile?.[key];
        return String(savedValue) === String(currentValue);
      });
      
      if (allMatch) {
        setSavedTaxValues({});
      }
    }
  }, [employeeDetail, savedTaxValues]);

  // Initialize employeeData from employeeDetail
  useEffect(() => {
    if (employeeDetail) {
      const data: Record<string, any> = {};
      // Copy all primitive values and dates from employeeDetail
      Object.keys(employeeDetail).forEach(key => {
        const value = (employeeDetail as any)[key];
        if (value !== null && value !== undefined && 
            (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || 
             value instanceof Date || (typeof value === 'object' && !Array.isArray(value) && !value.length))) {
          data[key] = value;
        }
      });
      setEmployeeData(data);
    }
  }, [employeeDetail]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setEmployeeData(prev => ({ ...prev, [fieldId]: value }));
    // Track master changes
    setMasterChanges(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleTaxFieldChange = (fieldId: string, value: any) => {
    setTaxChanges(prev => ({ ...prev, [fieldId]: value }));
  };

  // Helper: Track changes for detail tables
  const trackTableChanges = useCallback((
    tableName: 'contracts' | 'attendance' | 'bank_details' | 'pension' | 'pay_items',
    originalData: any[],
    currentData: any[],
    getRowId: (row: any, idx: number) => string | number,
  ) => {
    const originalIds = new Set(originalData.map((row, idx) => getRowId(row, idx)));
    const currentIds = new Set(currentData.map((row, idx) => getRowId(row, idx)));
    
    // Find deleted rows (in original but not in current)
    const deleted: (string | number)[] = [];
    originalData.forEach((row, idx) => {
      const id = getRowId(row, idx);
      if (!currentIds.has(id)) {
        // Get the actual ID from the row (contract_id, attendance_id, etc.)
        const actualId = row.contract_id || row.attendance_id || row.bank_detail_id || row.emp_pension_id || row.pay_item_id || id;
        deleted.push(actualId);
      }
    });
    
    // Find created and updated rows
    const created: any[] = [];
    const updated: any[] = [];
    
    currentData.forEach((row, idx) => {
      const id = getRowId(row, idx);
      const isNew = !originalIds.has(id) || 
                    id === null || 
                    id === undefined || 
                    String(id).startsWith('contract-') || 
                    String(id).startsWith('attendance-') || 
                    String(id).startsWith('bank-') || 
                    String(id).startsWith('pension-') || 
                    String(id).startsWith('payitem-');
      
      if (isNew) {
        created.push(row);
      } else {
        // Check if row was modified
        const originalRow = originalData.find((r, i) => getRowId(r, i) === id);
        if (originalRow) {
          const hasChanges = JSON.stringify(originalRow) !== JSON.stringify(row);
          if (hasChanges) {
            updated.push(row);
          }
        }
      }
    });
    
    // Update the appropriate state
    const changes = {
      created: created.length > 0 ? created : undefined,
      updated: updated.length > 0 ? updated : undefined,
      deleted: deleted.length > 0 ? deleted : undefined,
    };
    
    switch (tableName) {
      case 'contracts':
        setContractsChanges(changes);
        break;
      case 'attendance':
        setAttendanceChanges(changes);
        break;
      case 'bank_details':
        setBankDetailsChanges(changes);
        break;
      case 'pension':
        setPensionChanges(changes);
        break;
      case 'pay_items':
        setPayItemsChanges(changes);
        break;
    }
  }, []);

  const handleSave = async () => {
    if (!employee?.id) {
      console.error('Cannot save: employee ID is missing');
      return;
    }

    try {
      // Collect all changes
      const allChanges: EmployeeChanges = {};
      
      // Master changes (from Overview and Personal tabs)
      if (Object.keys(masterChanges).length > 0) {
        allChanges.master = masterChanges;
      }
      
      // Tax changes
      if (Object.keys(taxChanges).length > 0) {
        allChanges.tax = taxChanges;
      }
      
      // Detail table changes
      if (Object.keys(contractsChanges).length > 0 && 
          (contractsChanges.created?.length || contractsChanges.updated?.length || contractsChanges.deleted?.length)) {
        allChanges.contracts = contractsChanges;
      }
      
      if (Object.keys(attendanceChanges).length > 0 && 
          (attendanceChanges.created?.length || attendanceChanges.updated?.length || attendanceChanges.deleted?.length)) {
        allChanges.attendance = attendanceChanges;
      }
      
      if (Object.keys(bankDetailsChanges).length > 0 && 
          (bankDetailsChanges.created?.length || bankDetailsChanges.updated?.length || bankDetailsChanges.deleted?.length)) {
        allChanges.bank_details = bankDetailsChanges;
      }
      
      if (Object.keys(pensionChanges).length > 0 && 
          (pensionChanges.created?.length || pensionChanges.updated?.length || pensionChanges.deleted?.length)) {
        allChanges.pension = pensionChanges;
      }
      
      if (Object.keys(payItemsChanges).length > 0 && 
          (payItemsChanges.created?.length || payItemsChanges.updated?.length || payItemsChanges.deleted?.length)) {
        allChanges.pay_items = payItemsChanges;
      }

      // Check if there are any changes
      if (Object.keys(allChanges).length === 0) {
        console.log('[EmployeeDetail] No changes to save');
        setIsEditing(false);
        return;
      }

      console.log('[EmployeeDetail] Saving changes:', allChanges);
      console.log('[EmployeeDetail] Master changes:', masterChanges);
      console.log('[EmployeeDetail] Tax changes:', taxChanges);
      console.log('[EmployeeDetail] Contracts changes:', contractsChanges);
      console.log('[EmployeeDetail] Attendance changes:', attendanceChanges);
      console.log('[EmployeeDetail] Bank details changes:', bankDetailsChanges);
      console.log('[EmployeeDetail] Pension changes:', pensionChanges);
      console.log('[EmployeeDetail] Pay items changes:', payItemsChanges);

      // Save all changes in a transaction
      const result = await saveAll(allChanges);

      if (result.success) {
        // Store saved tax values to display immediately until employeeDetail refreshes
        if (Object.keys(taxChanges).length > 0) {
          setSavedTaxValues(prev => ({ ...prev, ...taxChanges }));
        }
        
        setIsEditing(false);
        
        // Refresh employee data from server
        if (onSave) {
          onSave();
        }
        
        // Clear change tracking after a delay to allow UI to update
        // The savedTaxValues will be cleared when employeeDetail refreshes
        setTimeout(() => {
          setMasterChanges({});
          setTaxChanges({});
          setContractsChanges({});
          setAttendanceChanges({});
          setBankDetailsChanges({});
          setPensionChanges({});
          setPayItemsChanges({});
        }, 100);
      } else {
        // Error is already set in the hook
        console.error('[EmployeeDetail] Save failed:', result.error);
        if (result.operationLog) {
          console.error('[EmployeeDetail] Operation log:', result.operationLog);
        }
      }
    } catch (error) {
      console.error('[EmployeeDetail] Error saving employee:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Clear all change tracking
    setMasterChanges({});
    setTaxChanges({});
    setContractsChanges({});
    setAttendanceChanges({});
    setBankDetailsChanges({});
    setPensionChanges({});
    setPayItemsChanges({});
    clearError();
    
    // Reset employeeData from employeeDetail
    if (employeeDetail) {
      const data: Record<string, any> = {};
      Object.keys(employeeDetail).forEach(key => {
        const value = (employeeDetail as any)[key];
        if (value !== null && value !== undefined && 
            (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || 
             value instanceof Date || (typeof value === 'object' && !Array.isArray(value) && !value.length))) {
          data[key] = value;
        }
      });
      setEmployeeData(data);
    }
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
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs disabled:opacity-50"
                  >
                    {isSaving ? tCommon('saving') || 'שומר...' : tCommon('save')}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    disabled={isSaving}
                    className="h-8 px-3 text-xs disabled:opacity-50"
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
                  <Button 
                    variant="outline" 
                    className="h-8 px-2.5 text-xs"
                    disabled={loadingPayslip}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (!employee || loadingPayslip) {
                        return;
                      }
                      
                      setLoadingPayslip(true);
                      try {
                        const token = localStorage.getItem('paylens_access_token');
                        if (!token) {
                          alert("לא מאומת - אנא התחבר מחדש");
                          setLoadingPayslip(false);
                          return;
                        }

                        // First, get the latest payslip ID
                        const payslipResponse = await fetch(`/api/payslips/latest/${employee.id}`, {
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                        });

                        const payslipData = await payslipResponse.json();

                        if (!payslipResponse.ok || !payslipData.success || !payslipData.data) {
                          alert("לא נמצא תלוש שכר עבור עובד זה");
                          setLoadingPayslip(false);
                          return;
                        }

                        // Extract payslip ID
                        const payslipId = payslipData.data?.payslip?.id || 
                                         payslipData.data?.id || 
                                         (payslipData.data?.payslip && typeof payslipData.data.payslip === 'string' ? payslipData.data.payslip : null);

                        if (!payslipId) {
                          alert("לא נמצא תלוש שכר עבור עובד זה");
                          setLoadingPayslip(false);
                          return;
                        }

                        // Open payslip in a new tab
                        window.open(`/${locale}/payslip/${payslipId}`, '_blank');
                      } catch (err: any) {
                        console.error("Error downloading payslip:", err);
                        alert(`❌ שגיאה בהורדת תלוש שכר: ${err.message || "Unknown error"}`);
                      } finally {
                        setLoadingPayslip(false);
                      }
                    }}
                  >
                    {loadingPayslip ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 mr-1.5 rtl:mr-0 rtl:ml-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        טוען...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 mr-1.5 rtl:mr-0 rtl:ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        {t('actions.payslip')}
                      </>
                    )}
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
          {/* Error Display */}
          {saveError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-semibold">שגיאה:</span>
                <p className="text-sm text-red-700 flex-1">{saveError}</p>
                <button
                  onClick={clearError}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs - Compact */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-3 h-9">
            <TabsTrigger value="overview" className="px-3 py-1 text-xs">{t('tabs.overview')}</TabsTrigger>
            <TabsTrigger value="personal" className="px-3 py-1 text-xs">{t('tabs.personal')}</TabsTrigger>
            <TabsTrigger value="employment" className="px-3 py-1 text-xs">{t('tabs.employment')}</TabsTrigger>
            <TabsTrigger value="payroll" className="px-3 py-1 text-xs">{t('tabs.payroll')}</TabsTrigger>
            <TabsTrigger value="time" className="px-3 py-1 text-xs">{t('tabs.timeAttendance')}</TabsTrigger>
            <TabsTrigger value="tax" className="px-3 py-1 text-xs">מיסים</TabsTrigger>
            <TabsTrigger value="pension" className="px-3 py-1 text-xs">פנסיה</TabsTrigger>
            <TabsTrigger value="payitems" className="px-3 py-1 text-xs">פרטי תשלום</TabsTrigger>
          </TabsList>

          {/* Overview Tab - All Employee Fields */}
          <TabsContent value="overview" className="space-y-3">
            {(() => {
              // Define field mappings with labels and types - ordered to minimize gaps
              const fieldDefinitions: Record<string, { label: string; type?: EditableField['type']; span?: number; lookupKey?: string }> = {
                employee_code: { label: 'קוד עובד', type: 'text', span: 1 },
                department_number: { label: 'מספר מחלקה', type: 'lookup', span: 1, lookupKey: 'department_number' },
                position: { label: 'תפקיד', type: 'text', span: 1 },
                job_title: { label: 'כותרת תפקיד', type: 'text', span: 1 },
                status: { label: 'סטטוס', type: 'text', span: 1 },
                employment_status: { label: 'סטטוס העסקה', type: 'lookup', span: 1, lookupKey: 'employment_status' },
                hire_date: { label: 'תאריך העסקה', type: 'date', span: 1 },
                is_active: { label: 'פעיל', type: 'select', span: 1 },
                site_number: { label: 'מספר אתר', type: 'lookup', span: 1, lookupKey: 'site_number' },
                employment_percent: { label: 'אחוז העסקה', type: 'number', span: 1 },
                created_at: { label: 'תאריך יצירה', type: 'date', span: 1 },
                updated_at: { label: 'תאריך עדכון', type: 'date', span: 1 },
              };

              // Get all fields from employeeData, excluding client_id, personal fields (shown in Personal tab), and related data
              const excludedFields = [
                'client_id', 'id', 'employee_id', 'bank_details', 'pay_items', 'pension_profile', 'tax_profile', 
                'attendance', 'contracts', 'leave_balances',
                'first_name', 'last_name', 'full_name', 'email', 'phone', 'cell_phone_number', 
                'tz_id', 'national_id', 'gender', 'date_of_birth', 'address_line1', 'address_line2', 'city_code', 'zip_code', 'termination_date',
                'department_id' // Exclude department_id - we only show department_number with lookup
              ];
              
              // Get all available fields in the defined order first, then add any other fields
              const orderedFields: EditableField[] = [];
              const otherFields: EditableField[] = [];
              
              // First, add all defined fields (even if not in employeeData)
              const order = Object.keys(fieldDefinitions);
              order.forEach(key => {
                if (!excludedFields.includes(key)) {
                  const def = fieldDefinitions[key];
                  const value = employeeData.hasOwnProperty(key) ? employeeData[key] : null;
                  
                  const field: EditableField = {
                    id: key,
                    label: def.label,
                    type: def.type,
                    value: value,
                    defaultValue: value,
                    span: def.span || 1,
                    // Special handling for boolean fields
                    ...(def.type === 'select' && key === 'is_active' ? {
                      options: [
                        { value: 'true', label: 'פעיל' },
                        { value: 'false', label: 'לא פעיל' },
                      ],
                    } : {}),
                    // Add lookupKey if defined
                    ...(def.lookupKey ? { lookupKey: def.lookupKey } : {}),
                  };
                  
                  orderedFields.push(field);
                }
              });
              
              // Then, add any other fields from employeeData that are not in fieldDefinitions
              Object.keys(employeeData).forEach(key => {
                if (!excludedFields.includes(key) && !fieldDefinitions[key]) {
                  const value = employeeData[key];
                  
                  const field: EditableField = {
                    id: key,
                    label: key, // Use key as label if not defined
                    type: 'text',
                    value: value,
                    defaultValue: value,
                    span: 1,
                  };
                  
                  otherFields.push(field);
                }
              });
              
              // Sort other fields alphabetically
              otherFields.sort((a, b) => a.id.localeCompare(b.id));
              
              const fields = [...orderedFields, ...otherFields];

              return (
                <EditableFields
                  fields={fields}
                  data={employeeData}
                  isEditing={isEditing}
                  onChange={handleFieldChange}
                  columns={3}
                />
              );
            })()}
          </TabsContent>

          {/* Personal Tab - Personal Information Only */}
          <TabsContent value="personal" className="space-y-3">
            {(() => {
              // Personal fields only - no duplication with Overview
              // Ordered to minimize gaps in the grid layout
              const personalFieldDefinitions: Record<string, { label: string; type?: EditableField['type']; span?: number; lookupKey?: string }> = {
                first_name: { label: 'שם פרטי', type: 'text', span: 1 },
                last_name: { label: 'שם משפחה', type: 'text', span: 1 },
                full_name: { label: 'שם מלא', type: 'text', span: 1 },
                email: { label: 'אימייל', type: 'email', span: 1 },
                phone: { label: 'טלפון', type: 'tel', span: 1 },
                cell_phone_number: { label: 'מספר טלפון נייד', type: 'tel', span: 1 },
                tz_id: { label: 'תעודת זהות', type: 'text', span: 1 },
                national_id: { label: 'מספר זהות', type: 'text', span: 1 },
                gender: { label: 'מין', type: 'text', span: 1 },
                date_of_birth: { label: 'תאריך לידה', type: 'date', span: 1 },
                address_line1: { label: 'כתובת שורה 1', type: 'text', span: 2 },
                address_line2: { label: 'כתובת שורה 2', type: 'text', span: 2 },
                city_code: { label: 'קוד עיר', type: 'text', span: 1 },
                zip_code: { label: 'מיקוד', type: 'text', span: 1 },
                termination_date: { label: 'תאריך סיום העסקה', type: 'date', span: 1 },
              };

              // Get all personal fields - arrange to minimize gaps
              // Separate fields by span to avoid gaps
              const singleSpanFields: EditableField[] = [];
              const doubleSpanFields: EditableField[] = [];
              
              Object.keys(personalFieldDefinitions).forEach(key => {
                const def = personalFieldDefinitions[key];
                const value = employeeData.hasOwnProperty(key) ? employeeData[key] : null;
                
                const field: EditableField = {
                  id: key,
                  label: def.label,
                  type: def.type || 'text',
                  value: value,
                  defaultValue: value,
                  span: def.span || 1,
                  // Add lookupKey if defined
                  ...(def.lookupKey ? { lookupKey: def.lookupKey } : {}),
                };
                
                if (def.span === 2) {
                  doubleSpanFields.push(field);
                } else {
                  singleSpanFields.push(field);
                }
              });
              
              // Arrange fields: single span first, then double span (to minimize gaps)
              const personalFields = [...singleSpanFields, ...doubleSpanFields];

              return (
                <EditableFields
                  fields={personalFields}
                  data={employeeData}
                  isEditing={isEditing}
                  onChange={handleFieldChange}
                  columns={3}
                />
              );
            })()}
          </TabsContent>

          {/* Employment Tab - Compact */}
          <TabsContent value="employment" className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{t('hireDate')}</label>
                {isEditing ? (
                  <Input 
                    type="date" 
                    defaultValue={formatDateOnly(employeeDetail?.hire_date)} 
                    className="h-8 text-sm" 
                  />
                ) : (
                  <p className="text-sm text-text-main py-1.5">
                    {formatDateOnly(employeeDetail?.hire_date) || "N/A"}
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

          {/* Payroll Tab - Contracts and Bank Details */}
          <TabsContent value="payroll" className="space-y-4">
            {/* Contracts */}
            <div>
              <h3 className="text-sm font-semibold text-text-main mb-2">חוזי העסקה</h3>
              <EditableTable
                columns={[
                  {
                    id: "start_date",
                    label: "תאריך התחלה",
                    editor: (value, row, onChange) => (
                      <Input
                        type="date"
                        value={formatDateOnly(value)}
                        onChange={(e) => onChange(e.target.value)}
                        className="min-h-10 h-auto text-sm"
                      />
                    ),
                    render: (value) => formatDateOnly(value) || "N/A",
                  },
                  {
                    id: "end_date",
                    label: "תאריך סיום",
                    editor: (value, row, onChange) => (
                      <Input
                        type="date"
                        value={formatDateOnly(value)}
                        onChange={(e) => onChange(e.target.value)}
                        className="min-h-10 h-auto text-sm"
                      />
                    ),
                    render: (value) => formatDateOnly(value) || "N/A",
                  },
                  {
                    id: "employment_type",
                    label: "סוג העסקה",
                    editor: (value, row, onChange) => (
                      <LookupSelect
                        lookupKey="employment_type"
                        value={value}
                        onChange={onChange}
                        className="min-h-10 h-auto text-sm"
                        allowEmpty={true}
                        emptyLabel="ללא"
                      />
                    ),
                    render: (value) => {
                      const config = require("@/lib/lookups").LOOKUP_CONFIGS["employment_type"];
                      const option = config?.options?.find((opt: any) => opt.value === value);
                      return option ? option.label : value || "N/A";
                    },
                  },
                  {
                    id: "base_salary_monthly",
                    label: "שכר בסיס חודשי",
                    editor: (value, row, onChange) => (
                      <Input
                        type="number"
                        step="0.01"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                        className="min-h-10 h-auto text-sm"
                      />
                    ),
                    render: (value) => value ? `₪${Number(value).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
                  },
                  {
                    id: "standard_hours_per_month",
                    label: "שעות סטנדרטיות לחודש",
                    editor: (value, row, onChange) => (
                      <Input
                        type="number"
                        step="0.01"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                        className="min-h-10 h-auto text-sm"
                      />
                    ),
                    render: (value) => value ? `${Number(value).toFixed(2)} שעות` : "N/A",
                  },
                  {
                    id: "hourly_rate",
                    label: "שכר לשעה",
                    editor: (value, row, onChange) => (
                      <Input
                        type="number"
                        step="0.01"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                        className="min-h-10 h-auto text-sm"
                      />
                    ),
                    render: (value) => value ? `₪${Number(value).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
                  },
                  {
                    id: "job_percent",
                    label: "אחוז משרה",
                    editor: (value, row, onChange) => (
                      <Input
                        type="number"
                        step="0.01"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                        className="min-h-10 h-auto text-sm"
                      />
                    ),
                    render: (value) => value ? `${Number(value).toFixed(2)}%` : "N/A",
                  },
                  {
                    id: "annual_vacation_days",
                    label: "ימי חופשה שנתיים",
                    editor: (value, row, onChange) => (
                      <Input
                        type="number"
                        step="0.01"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                        className="min-h-10 h-auto text-sm"
                      />
                    ),
                    render: (value) => value ? `${Number(value).toFixed(2)} ימים` : "N/A",
                  },
                  {
                    id: "annual_sick_days",
                    label: "ימי מחלה שנתיים",
                    editor: (value, row, onChange) => (
                      <Input
                        type="number"
                        step="0.01"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                        className="min-h-10 h-auto text-sm"
                      />
                    ),
                    render: (value) => value ? `${Number(value).toFixed(2)} ימים` : "N/A",
                  },
                  {
                    id: "annual_havraa_days",
                    label: "ימי הבראה שנתיים",
                    editor: (value, row, onChange) => (
                      <Input
                        type="number"
                        step="0.01"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                        className="min-h-10 h-auto text-sm"
                      />
                    ),
                    render: (value) => value ? `${Number(value).toFixed(2)} ימים` : "N/A",
                  },
                  {
                    id: "comment",
                    label: "הערות",
                    editor: (value, row, onChange) => (
                      <Input
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        className="min-h-10 h-auto text-sm"
                      />
                    ),
                    render: (value) => value || "N/A",
                  },
                ]}
                data={employeeDetail?.contracts || []}
                onAdd={async () => ({
                  id: null,
                  employee_id: employee?.id || employeeDetail?.id || "",
                  start_date: null,
                  end_date: null,
                  employment_type: "",
                  base_salary_monthly: null,
                  standard_hours_per_month: null,
                  hourly_rate: null,
                  job_percent: null,
                  annual_vacation_days: null,
                  annual_sick_days: null,
                  annual_havraa_days: null,
                  comment: "",
                })}
                onUpdate={async (row, index) => {
                  // TODO: Implement API call
                  console.log("Updating contract:", row);
                }}
                onDelete={async (row, index) => {
                  // TODO: Implement API call
                  console.log("Deleting contract:", row);
                }}
                onSave={async (rows) => {
                  console.log('[EmployeeDetail] Contracts onSave called with rows:', rows);
                  console.log('[EmployeeDetail] Original contracts:', employeeDetail?.contracts || []);
                  // Track changes for contracts
                  trackTableChanges('contracts', employeeDetail?.contracts || [], rows, (row: any, idx: number) => row.contract_id || row.id || `contract-${idx}`);
                  console.log('[EmployeeDetail] Contracts changes tracked');
                }}
                getRowId={(row, index) => row.contract_id || row.id || `contract-${index}`}
                emptyMessage="אין חוזי העסקה"
                addButtonLabel="הוסף חוזה"
                canAdd={isEditing}
                canEdit={isEditing}
                canDelete={isEditing}
              />
            </div>

            {/* Bank Details */}
            <div>
              <h3 className="text-sm font-semibold text-text-main mb-2">פרטי בנק</h3>
              <EditableTable
                columns={[
                  {
                    id: "bank_code",
                    label: "קוד בנק",
                    editor: (value, row, onChange) => (
                      <LookupSelect
                        lookupKey="bank_code"
                        value={value}
                        onChange={onChange}
                        className="min-h-10 h-auto text-sm"
                        allowEmpty={true}
                        emptyLabel="ללא"
                      />
                    ),
                    render: (value) => value || "N/A",
                  },
                  {
                    id: "branch_code",
                    label: "קוד סניף",
                    editor: (value, row, onChange) => (
                      <LookupSelect
                        lookupKey="branch_code"
                        value={value}
                        onChange={onChange}
                        className="min-h-10 h-auto text-sm"
                        allowEmpty={true}
                        emptyLabel="ללא"
                        filter={row.bank_code ? { bank_code: row.bank_code } : undefined}
                      />
                    ),
                    render: (value) => value || "N/A",
                  },
                  {
                    id: "account_number",
                    label: "מספר חשבון",
                    editor: (value, row, onChange) => (
                      <Input
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        className="min-h-10 h-auto text-sm"
                      />
                    ),
                    render: (value) => value || "N/A",
                  },
                  {
                    id: "account_name",
                    label: "שם החשבון",
                    editor: (value, row, onChange) => (
                      <Input
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        className="min-h-10 h-auto text-sm"
                      />
                    ),
                    render: (value) => value || "N/A",
                  },
                ]}
                data={employeeDetail?.bank_details || []}
                onAdd={async () => ({
                  id: null,
                  employee_id: employee?.id || employeeDetail?.id || "",
                  bank_code: "",
                  branch_code: "",
                  account_number: "",
                  account_name: "",
                })}
                onUpdate={async (row, index) => {
                  // TODO: Implement API call
                  console.log("Updating bank detail:", row);
                }}
                onDelete={async (row, index) => {
                  // TODO: Implement API call
                  console.log("Deleting bank detail:", row);
                }}
                onSave={async (rows) => {
                  console.log('[EmployeeDetail] Bank details onSave called with rows:', rows);
                  // Track changes for bank details
                  trackTableChanges('bank_details', employeeDetail?.bank_details || [], rows, (row: any, idx: number) => row.bank_detail_id || row.id || `bank-${idx}`);
                  console.log('[EmployeeDetail] Bank details changes tracked');
                }}
                getRowId={(row, index) => row.id || `bank-${index}`}
                emptyMessage="אין פרטי בנק"
                addButtonLabel="הוסף פרטי בנק"
                canAdd={isEditing}
                canEdit={isEditing}
                canDelete={isEditing}
              />
            </div>
          </TabsContent>

          {/* Time & Attendance Tab */}
          <TabsContent value="time" className="space-y-4">
            <EditableTable
              columns={[
                  {
                    id: "period_id",
                    label: "תקופה",
                    editor: (value, row, onChange) => (
                      <LookupSelect
                        lookupKey="period_id"
                        value={value}
                        onChange={onChange}
                        className="min-h-10 h-auto text-sm"
                        allowEmpty={true}
                        emptyLabel="ללא"
                      />
                    ),
                    render: (value) => value || "N/A",
                  },
                {
                  id: "work_days_actual",
                  label: "ימי עבודה בפועל",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)} ימים` : "N/A",
                },
                {
                  id: "work_hours_actual",
                  label: "שעות עבודה בפועל",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)} שעות` : "N/A",
                },
                {
                  id: "vacation_days_used",
                  label: "ימי חופשה",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)} ימים` : "N/A",
                },
                {
                  id: "sick_days_used",
                  label: "ימי מחלה",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)} ימים` : "N/A",
                },
                {
                  id: "miluim_days",
                  label: "ימי מילואים",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)} ימים` : "N/A",
                },
                {
                  id: "havraa_days_used",
                  label: "ימי הבראה",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)} ימים` : "N/A",
                },
              ]}
              data={employeeDetail?.attendance || []}
              onAdd={async () => ({
                id: null,
                employee_id: employee?.id || employeeDetail?.id || "",
                period_id: "",
                work_days_actual: null,
                work_hours_actual: null,
                vacation_days_used: null,
                sick_days_used: null,
                miluim_days: null,
                havraa_days_used: null,
              })}
              onUpdate={async (row, index) => {
                // TODO: Implement API call
                console.log("Updating attendance:", row);
              }}
              onDelete={async (row, index) => {
                // TODO: Implement API call
                console.log("Deleting attendance:", row);
              }}
              onSave={async (rows) => {
                console.log('[EmployeeDetail] Attendance onSave called with rows:', rows);
                // Track changes for attendance
                trackTableChanges('attendance', employeeDetail?.attendance || [], rows, (row: any, idx: number) => row.attendance_id || row.id || `attendance-${idx}`);
                console.log('[EmployeeDetail] Attendance changes tracked');
              }}
              getRowId={(row, index) => row.period_id || row.id || `attendance-${index}`}
              emptyMessage="אין רשומות נוכחות"
              addButtonLabel="הוסף רשומת נוכחות"
              canAdd={isEditing}
              canEdit={isEditing}
              canDelete={isEditing}
            />
          </TabsContent>

          {/* Tax Tab */}
          <TabsContent value="tax" className="space-y-3">
            {(() => {
              const taxFieldDefinitions: Record<string, { label: string; type?: EditableField['type']; span?: number; lookupKey?: string; render?: (value: any, isEditing: boolean, onChange: (value: any) => void) => React.ReactNode }> = {
                is_resident: { label: 'תושב', type: 'select', span: 1 },
                company_car_benefit_group_id: { 
                  label: 'קבוצת הטבה רכב חברה', 
                  type: 'lookup', 
                  span: 1, 
                  lookupKey: 'company_car_benefit_group_id',
                  render: (value, isEditing, onChange) => {
                    if (!isEditing) {
                      // Read-only mode - use LookupSelect
                      return (
                        <LookupSelect
                          lookupKey="company_car_benefit_group_id"
                          value={value}
                          onChange={() => {}}
                          disabled={true}
                          className="min-h-10 h-auto text-sm"
                        />
                      );
                    }
                    // Edit mode - use LookupGridSelect with grid view
                    // Use key prop to force re-render when value changes (after save)
                    return (
                      <LookupGridSelect
                        key={`car-benefit-${value || 'empty'}-${isEditing}`}
                        lookupKey="company_car_benefit_group_id"
                        value={value}
                        onChange={onChange}
                        className="min-h-10 h-auto text-sm"
                        searchable={true}
                        searchFields={['make_name', 'sub_model']}
                        displayColumns={['car_id', 'model_year', 'make_name', 'sub_model', 'monthly_car_benefit']}
                        columnLabels={{
                          'car_id': 'קוד',
                          'model_year': 'שנה',
                          'make_name': 'רכב',
                          'sub_model': 'מודל',
                          'monthly_car_benefit': 'הטבה חודשית',
                        }}
                      />
                    );
                  },
                },
                additional_credit_points: { label: 'נקודות זיכוי נוספות', type: 'number', span: 1 },
                special_tax_percent1: { label: 'אחוז מס מיוחד 1', type: 'number', span: 1 },
                spt1_annual_threshhold: { label: 'סף שנתי מס מיוחד 1', type: 'number', span: 1 },
                special_tax_percent2: { label: 'אחוז מס מיוחד 2', type: 'number', span: 1 },
                spt2_annual_threshhold: { label: 'סף שנתי מס מיוחד 2', type: 'number', span: 1 },
                is_tax_exempt: { label: 'פטור ממס', type: 'select', span: 1 },
                tax_exempt_threshold: { label: 'סף פטור ממס', type: 'number', span: 1 },
                is_bituach_leumi_special_pct: { label: 'אחוז ביטוח לאומי מיוחד', type: 'select', span: 1 },
                special_bl_percent: { label: 'אחוז ביטוח לאומי מיוחד', type: 'number', span: 1 },
                special_bl_threshhold: { label: 'סף ביטוח לאומי מיוחד', type: 'number', span: 1 },
              };

              // Merge taxChanges and savedTaxValues into taxData for immediate display
              // savedTaxValues contains values that were just saved (until employeeDetail refreshes)
              // taxChanges contains values being edited (during editing)
              const taxData = { 
                ...(employeeDetail?.tax_profile || {}), 
                ...savedTaxValues, // Saved values take precedence (most recent)
                ...taxChanges, // Current edits take highest precedence
              };
              // Show all defined fields, not just those that exist in taxData
              // This ensures all fields are displayed even if tax_profile is empty or missing
              const taxFields: EditableField[] = Object.keys(taxFieldDefinitions)
                .map(key => {
                  const def = taxFieldDefinitions[key];
                  const value = taxData[key] ?? null; // Use null if not in taxData
                  
                  return {
                    id: key,
                    label: def.label,
                    type: def.type || 'text',
                    value: value, // This is the key - field.value should be used in read-only mode
                    defaultValue: value,
                    span: def.span || 1,
                    ...(def.type === 'select' && (key === 'is_resident' || key === 'is_tax_exempt' || key === 'is_bituach_leumi_special_pct') ? {
                      options: [
                        { value: 'true', label: 'כן' },
                        { value: 'false', label: 'לא' },
                      ],
                    } : {}),
                    // Add lookupKey if defined
                    ...(def.lookupKey ? { lookupKey: def.lookupKey } : {}),
                    // Add render function if defined
                    ...(def.render ? { render: def.render } : {}),
                  };
                });

              return (
                <EditableFields
                  fields={taxFields}
                  data={taxData}
                  isEditing={isEditing}
                  onChange={handleTaxFieldChange}
                  columns={3}
                />
              );
            })()}
          </TabsContent>

          {/* Pension Tab */}
          <TabsContent value="pension" className="space-y-4" key={`pension-${isEditing}`}>
            <EditableTable
              columns={[
                {
                  id: "pension_fund_name",
                  label: "שם קרן פנסיה",
                  editor: (value, row, onChange) => (
                    <Input
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value || "N/A",
                },
                {
                  id: "pension_policy_no",
                  label: "מספר פוליסה",
                  editor: (value, row, onChange) => (
                    <Input
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value || "N/A",
                },
                {
                  id: "pension_is_amount_based",
                  label: "מבוסס סכום",
                  editor: (value, row, onChange) => (
                    <Select value={value ? "true" : "false"} onChange={(e) => onChange(e.target.value === "true")} className="h-8 text-sm">
                      <option value="true">כן</option>
                      <option value="false">לא</option>
                    </Select>
                  ),
                  render: (value) => value ? "כן" : "לא",
                },
                {
                  id: "employer_pension_pct",
                  label: "אחוז פנסיה מעביד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)}%` : "N/A",
                },
                {
                  id: "employee_pension_pct",
                  label: "אחוז פנסיה עובד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)}%` : "N/A",
                },
                {
                  id: "employer_severance_pct",
                  label: "אחוז פיצויים מעביד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)}%` : "N/A",
                },
                {
                  id: "employer_disability_pct",
                  label: "אחוז נכות מעביד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)}%` : "N/A",
                },
                {
                  id: "employee_disability_pct",
                  label: "אחוז נכות עובד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)}%` : "N/A",
                },
                {
                  id: "pension_ceiling_monthly",
                  label: "תקרה חודשית פנסיה",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `₪${Number(value).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
                },
                {
                  id: "employer_pension_amount",
                  label: "סכום פנסיה מעביד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `₪${Number(value).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
                },
                {
                  id: "employee_pension_amount",
                  label: "סכום פנסיה עובד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `₪${Number(value).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
                },
                {
                  id: "employer_severance_amount",
                  label: "סכום פיצויים מעביד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `₪${Number(value).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
                },
                {
                  id: "employer_disability_amount",
                  label: "סכום נכות מעביד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `₪${Number(value).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
                },
                {
                  id: "employee_disability_amount",
                  label: "סכום נכות עובד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `₪${Number(value).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
                },
                {
                  id: "kh_enabled",
                  label: "קופת גמל מופעלת",
                  editor: (value, row, onChange) => (
                    <Select value={value ? "true" : "false"} onChange={(e) => onChange(e.target.value === "true")} className="h-8 text-sm">
                      <option value="true">כן</option>
                      <option value="false">לא</option>
                    </Select>
                  ),
                  render: (value) => value ? "כן" : "לא",
                },
                {
                  id: "kh_is_amount_based",
                  label: "קופת גמל מבוססת סכום",
                  editor: (value, row, onChange) => (
                    <Select value={value ? "true" : "false"} onChange={(e) => onChange(e.target.value === "true")} className="h-8 text-sm">
                      <option value="true">כן</option>
                      <option value="false">לא</option>
                    </Select>
                  ),
                  render: (value) => value ? "כן" : "לא",
                },
                {
                  id: "kh_employer_pct",
                  label: "אחוז קופת גמל מעביד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)}%` : "N/A",
                },
                {
                  id: "kh_employee_pct",
                  label: "אחוז קופת גמל עובד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)}%` : "N/A",
                },
                {
                  id: "kh_ceiling_monthly",
                  label: "תקרה חודשית קופת גמל",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `₪${Number(value).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
                },
                {
                  id: "kh_employer_amount",
                  label: "סכום קופת גמל מעביד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `₪${Number(value).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
                },
                {
                  id: "kh_employee_amount",
                  label: "סכום קופת גמל עובד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `₪${Number(value).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
                },
              ]}
              data={Array.isArray(employeeDetail?.pension_profile) ? employeeDetail.pension_profile : (employeeDetail?.pension_profile ? [employeeDetail.pension_profile] : [])}
              onAdd={async () => ({
                id: null,
                employee_id: employee?.id || employeeDetail?.id || "",
                pension_fund_name: "",
                pension_policy_no: "",
                pension_is_amount_based: false,
                employer_pension_pct: null,
                employee_pension_pct: null,
                employer_severance_pct: null,
                employer_disability_pct: null,
                employee_disability_pct: null,
                pension_ceiling_monthly: null,
                employer_pension_amount: null,
                employee_pension_amount: null,
                employer_severance_amount: null,
                employer_disability_amount: null,
                employee_disability_amount: null,
                kh_enabled: false,
                kh_is_amount_based: false,
                kh_employer_pct: null,
                kh_employee_pct: null,
                kh_ceiling_monthly: null,
                kh_employer_amount: null,
                kh_employee_amount: null,
              })}
              onUpdate={async (row, index) => {
                if (!employee?.id && !employeeDetail?.id) return;
                const employeeId = employee?.id || employeeDetail?.id;
                const pensionId = row.emp_pension_id || row.id;
                
                try {
                  const token = localStorage.getItem('token');
                  if (!token) {
                    console.error("No authentication token found");
                    return;
                  }

                  // Remove id and emp_pension_id from update data (they shouldn't be updated)
                  const { id, emp_pension_id, employee_id, ...updateData } = row;

                  let response;
                  if (!pensionId || pensionId === null) {
                    // Create new record
                    response = await fetch(`/api/employees/${employeeId}/pension`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                      body: JSON.stringify(updateData),
                    });
                  } else {
                    // Update existing record
                    response = await fetch(`/api/employees/${employeeId}/pension/${pensionId}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                      body: JSON.stringify(updateData),
                    });
                  }

                  if (!response.ok) {
                    const error = await response.json();
                    console.error("Error saving pension record:", error);
                    throw new Error(error.message || 'Failed to save pension record');
                  }

                  const result = await response.json();
                  console.log("Pension record saved:", result);
                  
                  // Refresh employee detail if onSave callback is provided
                  if (onSave) {
                    onSave();
                  }
                } catch (error: any) {
                  console.error("Error saving pension record:", error);
                  throw error;
                }
              }}
              onDelete={async (row, index) => {
                if (!employee?.id && !employeeDetail?.id) return;
                const employeeId = employee?.id || employeeDetail?.id;
                const pensionId = row.emp_pension_id || row.id;
                
                if (!pensionId) {
                  console.error("Cannot delete pension record: missing pension ID");
                  return;
                }

                if (!confirm("האם אתה בטוח שברצונך למחוק את רשומת הפנסיה?")) {
                  return;
                }

                try {
                  const token = localStorage.getItem('token');
                  if (!token) {
                    console.error("No authentication token found");
                    return;
                  }

                  const response = await fetch(`/api/employees/${employeeId}/pension/${pensionId}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    console.error("Error deleting pension record:", error);
                    throw new Error(error.message || 'Failed to delete pension record');
                  }

                  const result = await response.json();
                  console.log("Pension record deleted:", result);
                  
                  // Refresh employee detail if onSave callback is provided
                  if (onSave) {
                    onSave();
                  }
                } catch (error: any) {
                  console.error("Error deleting pension record:", error);
                  throw error;
                }
              }}
              onSave={async (rows) => {
                console.log('[EmployeeDetail] Pension onSave called with rows:', rows);
                // Track changes for pension
                trackTableChanges('pension', employeeDetail?.pension_profile || [], rows, (row: any, idx: number) => row.emp_pension_id || row.id || `pension-${idx}`);
                console.log('[EmployeeDetail] Pension changes tracked');
              }}
              getRowId={(row, index) => row.emp_pension_id || row.id || `pension-${index}`}
              emptyMessage="אין רשומות פנסיה"
              addButtonLabel="הוסף רשומת פנסיה"
              canAdd={isEditing}
              canEdit={isEditing}
              canDelete={isEditing}
            />
          </TabsContent>

          {/* Pay Items Tab */}
          <TabsContent value="payitems" className="space-y-4">
            <EditableTable
              columns={[
                {
                  id: "item_code",
                  label: "קוד פריט",
                  editor: (value, row, onChange) => (
                    <LookupSelect
                      lookupKey="item_code"
                      value={value}
                      onChange={onChange}
                      className="min-h-10 h-auto text-sm"
                      allowEmpty={true}
                      emptyLabel="ללא"
                    />
                  ),
                  render: (value) => value || "N/A",
                },
                {
                  id: "pay_item_name",
                  label: "שם פריט תשלום",
                  editor: (value, row, onChange) => (
                    <Input
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value || "N/A",
                },
                {
                  id: "is_hour_based",
                  label: "מבוסס שעות",
                  editor: (value, row, onChange) => (
                    <Select value={value ? "true" : "false"} onChange={(e) => onChange(e.target.value === "true")} className="h-8 text-sm">
                      <option value="true">כן</option>
                      <option value="false">לא</option>
                    </Select>
                  ),
                  render: (value) => value ? "כן" : "לא",
                },
                {
                  id: "amount",
                  label: "סכום",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `₪${Number(value).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
                },
                {
                  id: "quantity",
                  label: "כמות",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)}` : "N/A",
                },
                {
                  id: "rate",
                  label: "תעריף",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `₪${Number(value).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
                },
                {
                  id: "pct",
                  label: "אחוז",
                  editor: (value, row, onChange) => (
                    <Input
                      type="number"
                      step="0.01"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? `${Number(value).toFixed(2)}%` : "N/A",
                },
                {
                  id: "comments",
                  label: "הערות",
                  editor: (value, row, onChange) => (
                    <Input
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value || "N/A",
                },
                {
                  id: "department_number",
                  label: "מספר מחלקה",
                  editor: (value, row, onChange) => (
                    <LookupSelect
                      lookupKey="department_number"
                      value={value}
                      onChange={onChange}
                      className="min-h-10 h-auto text-sm"
                      allowEmpty={true}
                      emptyLabel="ללא"
                    />
                  ),
                  render: (value) => value || "N/A",
                },
                {
                  id: "effective_to",
                  label: "תוקף עד",
                  editor: (value, row, onChange) => (
                    <Input
                      type="date"
                      value={value ? (value instanceof Date ? value.toISOString().split('T')[0] : String(value).split('T')[0]) : ""}
                      onChange={(e) => onChange(e.target.value)}
                      className="min-h-10 h-auto text-sm"
                    />
                  ),
                  render: (value) => value ? new Date(value).toLocaleDateString("he-IL") : "N/A",
                },
              ]}
              data={employeeDetail?.pay_items || []}
              onAdd={async () => ({
                id: null,
                employee_id: employee?.id || employeeDetail?.id || "",
                item_code: "",
                pay_item_name: "",
                is_hour_based: false,
                amount: null,
                quantity: null,
                rate: null,
                pct: null,
                comments: "",
                department_number: null,
                effective_to: null,
              })}
              onUpdate={async (row, index) => {
                // TODO: Implement API call
                console.log("Updating pay item:", row);
              }}
              onDelete={async (row, index) => {
                // TODO: Implement API call
                console.log("Deleting pay item:", row);
              }}
              onSave={async (rows) => {
                console.log('[EmployeeDetail] Pay items onSave called with rows:', rows);
                // Track changes for pay items
                trackTableChanges('pay_items', employeeDetail?.pay_items || [], rows, (row: any, idx: number) => row.pay_item_id || row.id || `payitem-${idx}`);
                console.log('[EmployeeDetail] Pay items changes tracked');
              }}
              getRowId={(row, index) => row.pay_item_id || row.id || `payitem-${index}`}
              emptyMessage="אין פריטי תשלום"
              addButtonLabel="הוסף פריט תשלום"
              canAdd={isEditing}
              canEdit={isEditing}
              canDelete={isEditing}
            />
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
                          ? `${t('fields.started')}: ${formatDateOnly(contract.start_date)}`
                          : ""}
                        {contract.end_date 
                          ? ` - ${t('fields.ends')}: ${formatDateOnly(contract.end_date)}`
                          : ""}
                        {contract.salary !== null && contract.salary !== undefined
                          ? ` - ${t('fields.salary')}: $${Number(contract.salary).toLocaleString()}`
                          : ""}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {tCommon('status')}: <span className={`${
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

