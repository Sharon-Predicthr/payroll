"use client";

import { useState, useEffect } from "react";
import { PayslipHeader } from "@/app/[locale]/payslip/[payslipId]/components/PayslipHeader";
import { EmployeeDetailsCard } from "@/app/[locale]/payslip/[payslipId]/components/EmployeeDetailsCard";
import { EarningsTable } from "@/app/[locale]/payslip/[payslipId]/components/EarningsTable";
import { DeductionsTable } from "@/app/[locale]/payslip/[payslipId]/components/DeductionsTable";
import { SummaryCards } from "@/app/[locale]/payslip/[payslipId]/components/SummaryCards";
import { VacationSickBalances } from "@/app/[locale]/payslip/[payslipId]/components/VacationSickBalances";
import { PayslipFooter } from "@/app/[locale]/payslip/[payslipId]/components/PayslipFooter";
import { getAuthHeader, getTenant } from "@/lib/auth";
import { Loader2 } from "lucide-react";

const API_BASE_URL = "/api";

export interface PayslipData {
  payslip: {
    id: string;
    month: number;
    year: number;
    generation_date: string;
    version: string;
  };
  company: {
    name: string;
    registration_number: string;
  };
  employee: {
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
  };
  earnings: Array<{
    code: string;
    description: string;
    quantity: number;
    rate: number;
    taxable_value: number;
    amount: number;
    explanation?: string;
  }>;
  deductions: Array<{
    description: string;
    amount: number;
  }>;
  mandatory_deductions?: Array<{
    description: string;
    amount: number;
  }>;
  personal_deductions?: Array<{
    description: string;
    amount: number;
  }>;
  totals: {
    total_earnings: number;
    total_deductions: number;
    net_salary: number;
    taxable_salary: number;
    insured_salary: number;
    tax_percentage: number;
    credit_points: number;
  };
  attendance: {
    work_days: number;
    work_hours: number;
    absence_days: number;
  };
  balances: {
    vacation: {
      previous_balance: number;
      accrued: number;
      used: number;
      new_balance: number;
    };
    sick: {
      previous_balance: number;
      accrued: number;
      used: number;
      new_balance: number;
    };
  };
  permissions: {
    can_edit: boolean;
    can_download_pdf: boolean;
  };
}

interface PayslipViewProps {
  payslipId: string;
  mode?: 'page' | 'dialog' | 'embedded';
  onBack?: () => void;
  onClose?: () => void;
  showActions?: boolean;
  onDownloadPDF?: (payslipId: string) => void;
}

export function PayslipView({
  payslipId,
  mode = 'page',
  onBack,
  onClose,
  showActions = true,
  onDownloadPDF,
}: PayslipViewProps) {
  const [data, setData] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    fetchPayslip();
  }, [payslipId]);

  const fetchPayslip = async () => {
    try {
      setLoading(true);
      setError(null);

      const authHeader = getAuthHeader();
      if (!authHeader) {
        setError("לא מאומת - אנא התחבר מחדש");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/payslips/${payslipId}`, {
        headers: { Authorization: authHeader },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch payslip (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error("[PayslipView] Error fetching payslip:", err);
      setError(err.message || "Failed to load payslip");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    // Prevent multiple simultaneous downloads
    if (downloadingPDF) {
      console.log("[PayslipView] PDF download already in progress, ignoring request");
      return;
    }

    console.log("[PayslipView] handleDownloadPDF called, payslipId:", payslipId);
    
    if (onDownloadPDF) {
      console.log("[PayslipView] Using custom onDownloadPDF handler");
      onDownloadPDF(payslipId);
      return;
    }

    setDownloadingPDF(true);
    try {
      const authHeader = getAuthHeader();
      if (!authHeader) {
        console.error("[PayslipView] No auth header");
        alert("לא מאומת - אנא התחבר מחדש");
        return;
      }

      console.log("[PayslipView] Fetching PDF from:", `${API_BASE_URL}/payslips/${payslipId}/pdf`);
      
      const response = await fetch(`${API_BASE_URL}/payslips/${payslipId}/pdf`, {
        method: "POST",
        headers: { 
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log("[PayslipView] PDF response status:", response.status);
      console.log("[PayslipView] PDF response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Try to get error message from JSON response
        let errorMessage = `Failed to generate PDF (${response.status})`;
        try {
          const errorText = await response.text();
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
        } catch (e) {
          console.error("[PayslipView] Error reading error response:", e);
        }
        console.error("[PayslipView] PDF generation failed:", errorMessage);
        throw new Error(errorMessage);
      }

      // Check content type to ensure it's a PDF
      const contentType = response.headers.get('Content-Type');
      console.log("[PayslipView] PDF response Content-Type:", contentType);
      
      // Clone the response to check if it's an error
      const responseClone = response.clone();
      
      if (contentType && !contentType.includes('pdf') && !contentType.includes('application/octet-stream')) {
        // Might be JSON error response
        const errorText = await responseClone.text();
        let errorMessage = "Failed to generate PDF";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      console.log("[PayslipView] PDF blob size:", blob.size, "bytes");
      
      if (blob.size === 0) {
        throw new Error("PDF is empty");
      }
      
      // Additional check: if blob is very small (< 100 bytes), it might be an error message
      if (blob.size < 100) {
        const text = await new Response(blob).text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || "PDF generation failed");
        } catch (e) {
          // If not JSON, it's probably a real small PDF, continue with original blob
          // Recreate blob from the text (in case it was actually text)
          if (text.startsWith('{') || text.startsWith('<')) {
            throw new Error("PDF generation failed: received error response");
          }
        }
      }
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `payslip-${payslipId}.pdf`;
      
      if (contentDisposition) {
        console.log("[PayslipView] Content-Disposition:", contentDisposition);
        const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
        if (filenameStarMatch && filenameStarMatch[1]) {
          filename = decodeURIComponent(filenameStarMatch[1]);
        } else {
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
            try {
              filename = decodeURIComponent(filename);
            } catch (e) {
              // Keep original if decode fails
            }
          }
        }
      }

      console.log("[PayslipView] Downloading file:", filename);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log("[PayslipView] PDF download initiated successfully");
    } catch (err: any) {
      console.error("[PayslipView] Error downloading PDF:", err);
      alert("שגיאה בהורדת PDF: " + (err.message || "Unknown error"));
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (mode === 'dialog' && onClose) {
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="mr-2">טוען תלוש שכר...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium mb-4">שגיאה בטעינת תלוש שכר</p>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={fetchPayslip}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const monthNames = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
  ];
  const monthName = monthNames[data.payslip.month - 1] || "";

  const containerClasses = mode === 'dialog' 
    ? 'max-h-[90vh] overflow-y-auto' 
    : mode === 'embedded'
    ? 'border border-gray-200 rounded-lg p-4'
    : '';

  return (
    <div className={containerClasses}>
      {showActions && (
        <PayslipHeader
          month={monthName}
          year={data.payslip.year}
          companyName={(() => {
            // Use tenant name from localStorage (same as TopBar) if available, otherwise fall back to company.name from backend
            const tenant = getTenant();
            return tenant?.name || data.company.name || '';
          })()}
          companyRegistration={data.company.registration_number}
          canDownloadPDF={data.permissions.can_download_pdf}
          onDownloadPDF={handleDownloadPDF}
          onPrint={handlePrint}
          onBack={handleBack}
          downloadingPDF={downloadingPDF}
        />
      )}

      <div className="space-y-6 mt-6">
        <EmployeeDetailsCard 
          employee={data.employee} 
          canEdit={data.permissions.can_edit}
          onEdit={() => {}}
        />

        <EarningsTable earnings={data.earnings} />

        {data.mandatory_deductions && data.mandatory_deductions.length > 0 && (
          <DeductionsTable
            title="ניכויים חובה"
            deductions={data.mandatory_deductions}
          />
        )}

        {data.personal_deductions && data.personal_deductions.length > 0 && (
          <DeductionsTable
            title="ניכויים אישיים"
            deductions={data.personal_deductions}
          />
        )}

        {(!data.mandatory_deductions || data.mandatory_deductions.length === 0) &&
         (!data.personal_deductions || data.personal_deductions.length === 0) &&
         data.deductions && data.deductions.length > 0 && (
          <DeductionsTable deductions={data.deductions} />
        )}

        <SummaryCards
          netSalary={data.totals.net_salary}
          taxableSalary={data.totals.taxable_salary}
          insuredSalary={data.totals.insured_salary}
          taxPercentage={data.totals.tax_percentage}
          creditPoints={data.totals.credit_points}
          workDays={data.attendance.work_days}
          workHours={data.attendance.work_hours}
          absenceDays={data.attendance.absence_days}
        />

        <VacationSickBalances
          vacation={data.balances.vacation}
          sick={data.balances.sick}
        />

        <PayslipFooter
          generationDate={data.payslip.generation_date}
          payslipId={data.payslip.id}
          version={data.payslip.version}
        />
      </div>
    </div>
  );
}

