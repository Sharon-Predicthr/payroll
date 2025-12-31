"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthHeader } from "@/lib/auth";
import { usePayrollPeriod } from "@/contexts/PayrollPeriodContext";
import { LookupSelect } from "@/components/LookupSelect/LookupSelect";

const API_BASE_URL = "/api";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (employeeId: string) => void;
}


export function AddEmployeeDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddEmployeeDialogProps) {
  const { selectedPeriod } = usePayrollPeriod();
  
  // Form state - Mandatory fields
  const [employeeId, setEmployeeId] = useState("");
  const [tzId, setTzId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState<"EMPLOYEE" | "CONTRACTOR">("EMPLOYEE");
  const [departmentNumber, setDepartmentNumber] = useState<number | null>(null);
  
  // Form state - Optional fields
  const [employmentPercent, setEmploymentPercent] = useState<number | "">(100);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [cityCode, setCityCode] = useState<number | "">("");
  const [zipCode, setZipCode] = useState("");
  const [cellPhoneNumber, setCellPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [siteNumber, setSiteNumber] = useState<number | "">("");
  const [managerId, setManagerId] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  // Additional state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Set default hire_date to current period start if available
      if (selectedPeriod?.period_start_date) {
        const startDate = selectedPeriod.period_start_date instanceof Date
          ? selectedPeriod.period_start_date
          : new Date(selectedPeriod.period_start_date);
        setHireDate(startDate.toISOString().split('T')[0]);
      }
    } else {
      // Reset all fields when dialog closes
      setEmployeeId("");
      setTzId("");
      setFirstName("");
      setLastName("");
      setGender("MALE");
      setDateOfBirth("");
      setHireDate("");
      setEmploymentStatus("EMPLOYEE");
      setDepartmentNumber(null);
      setEmploymentPercent(100);
      setAddressLine1("");
      setAddressLine2("");
      setCityCode("");
      setZipCode("");
      setCellPhoneNumber("");
      setEmail("");
      setJobTitle("");
      setSiteNumber("");
      setManagerId("");
      setIsActive(true);
      setError(null);
    }
  }, [open, selectedPeriod]);

  const validateForm = (): string | null => {
    if (!employeeId.trim()) return "מזהה עובד הוא שדה חובה";
    if (!tzId.trim()) return "תעודת זהות היא שדה חובה";
    if (!firstName.trim()) return "שם פרטי הוא שדה חובה";
    if (!lastName.trim()) return "שם משפחה הוא שדה חובה";
    if (!dateOfBirth) return "תאריך לידה הוא שדה חובה";
    if (!hireDate) return "תאריך העסקה הוא שדה חובה";
    if (!departmentNumber) return "מספר מחלקה הוא שדה חובה";
    
    // Validate employment_percent range
    if (employmentPercent !== "" && (employmentPercent < 0 || employmentPercent > 100)) {
      return "אחוז העסקה חייב להיות בין 0 ל-100";
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authHeader = getAuthHeader();
      if (!authHeader) {
        setError("לא מאומת");
        setLoading(false);
        return;
      }

      const requestBody: any = {
        employee_id: employeeId.trim(),
        tz_id: tzId.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender,
        date_of_birth: dateOfBirth,
        hire_date: hireDate,
        employment_status: employmentStatus,
        department_number: departmentNumber ? Number(departmentNumber) : undefined,
      };

      // Optional fields
      if (employmentPercent !== "" && employmentPercent !== null) {
        requestBody.employment_percent = Number(employmentPercent);
      }
      if (addressLine1.trim()) requestBody.address_line1 = addressLine1.trim();
      if (addressLine2.trim()) requestBody.address_line2 = addressLine2.trim();
      if (cityCode !== "" && cityCode !== null) requestBody.city_code = Number(cityCode);
      if (zipCode.trim()) requestBody.zip_code = zipCode.trim();
      if (cellPhoneNumber.trim()) requestBody.cell_phone_number = cellPhoneNumber.trim();
      if (email.trim()) requestBody.email = email.trim();
      if (jobTitle.trim()) requestBody.job_title = jobTitle.trim();
      if (siteNumber !== "" && siteNumber !== null) requestBody.site_number = Number(siteNumber);
      if (managerId.trim()) requestBody.manager_id = managerId.trim();
      requestBody.is_active = isActive;

      const response = await fetch(`${API_BASE_URL}/employees/add`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      let data: any;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error("Empty response from server");
        }
        data = JSON.parse(text);
      } catch (parseError: any) {
        console.error("Error parsing response:", parseError);
        setError("שגיאה בקבלת תשובה מהשרת. אנא נסה שוב.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        // Handle SP error codes
        if (data.status_code !== undefined) {
          const errorMessages: Record<number, string> = {
            10: "לקוח לא נמצא",
            11: "עובד כבר קיים",
            12: "תעודת זהות לא תקינה",
            13: "מין לא תקין",
            14: "סטטוס העסקה לא תקין",
            15: "מחלקה לא נמצאה או לא פעילה",
            16: "אחוז העסקה מחוץ לטווח",
            17: "אין תקופת שכר פתוחה או תאריך העסקה מחוץ לתקופה הנוכחית",
            99: "שגיאה בלתי צפויה",
          };
          
          const errorMessage = errorMessages[data.status_code] || data.status_message || "שגיאה בהוספת עובד";
          setError(`${errorMessage} (קוד שגיאה: ${data.status_code})`);
        } else if (data.message) {
          setError(data.message);
        } else if (data.error) {
          setError(data.error);
        } else {
          setError("שגיאה בהוספת עובד");
        }
        setLoading(false);
        return;
      }

      if (data.success && data.employee_id) {
        onSuccess(data.employee_id);
        onOpenChange(false);
      } else {
        setError("שגיאה בהוספת עובד");
      }
    } catch (err: any) {
      console.error("Error adding employee:", err);
      setError(err.message || "שגיאה בהוספת עובד");
    } finally {
      setLoading(false);
    }
  };


  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-5">
        <DialogHeader>
          <DialogTitle>הוסף עובד חדש</DialogTitle>
        </DialogHeader>
        <DialogClose />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Mandatory Fields Section */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-gray-900 border-b pb-1.5">
              שדות חובה <span className="text-red-500">*</span>
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  מזהה עובד <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  תעודת זהות <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={tzId}
                  onChange={(e) => setTzId(e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  שם פרטי <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  שם משפחה <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  מין <span className="text-red-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE" | "OTHER")}
                  required
                  className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MALE">זכר</option>
                  <option value="FEMALE">נקבה</option>
                  <option value="OTHER">אחר</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  תאריך לידה <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  תאריך העסקה <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  סטטוס העסקה <span className="text-red-500">*</span>
                </label>
                <select
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value as "EMPLOYEE" | "CONTRACTOR")}
                  required
                  className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EMPLOYEE">עובד</option>
                  <option value="CONTRACTOR">קבלן</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  מספר מחלקה <span className="text-red-500">*</span>
                </label>
                <LookupSelect
                  lookupKey="department_number"
                  value={departmentNumber}
                  onChange={(value) => setDepartmentNumber(value ? Number(value) : null)}
                  placeholder="בחר מחלקה"
                  className="w-full"
                  allowEmpty={false}
                />
              </div>
            </div>
          </div>

          {/* Optional Fields Section */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-gray-900 border-b pb-1.5">
              שדות אופציונליים
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  אחוז העסקה
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={employmentPercent}
                  onChange={(e) => setEmploymentPercent(e.target.value ? Number(e.target.value) : "")}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  כתובת שורה 1
                </label>
                <Input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  כתובת שורה 2
                </label>
                <Input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  קוד עיר
                </label>
                <Input
                  type="number"
                  value={cityCode}
                  onChange={(e) => setCityCode(e.target.value ? Number(e.target.value) : "")}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  מיקוד
                </label>
                <Input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  טלפון נייד
                </label>
                <Input
                  type="tel"
                  value={cellPhoneNumber}
                  onChange={(e) => setCellPhoneNumber(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  אימייל
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  תפקיד
                </label>
                <Input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  מספר אתר
                </label>
                <Input
                  type="number"
                  value={siteNumber}
                  onChange={(e) => setSiteNumber(e.target.value ? Number(e.target.value) : "")}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  מזהה מנהל
                </label>
                <Input
                  type="text"
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-xs font-medium text-gray-700">
                  פעיל
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? "שומר..." : "שמור"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

