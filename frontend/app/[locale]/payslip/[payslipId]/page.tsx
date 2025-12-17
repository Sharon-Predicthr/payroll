"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { PageShell } from "@/components/PageShell";
import { getAuthHeader, isAuthenticated } from "@/lib/auth";
import { PayslipHeader } from "./components/PayslipHeader";
import { EmployeeDetailsCard } from "./components/EmployeeDetailsCard";
import { EarningsTable } from "./components/EarningsTable";
import { DeductionsTable } from "./components/DeductionsTable";
import { SummaryCards } from "./components/SummaryCards";
import { VacationSickBalances } from "./components/VacationSickBalances";
import { PayslipFooter } from "./components/PayslipFooter";

const API_BASE_URL = "/api";

interface PayslipData {
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

export default function PayslipPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const payslipId = params.payslipId as string;

  const [data, setData] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push(`/${locale}/login`);
      return;
    }

    fetchPayslip();
  }, [payslipId, locale, router]);

  const fetchPayslip = async () => {
    try {
      setLoading(true);
      setError(null);

      const authHeader = getAuthHeader();
      if (!authHeader) {
        router.push(`/${locale}/login`);
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
      console.error("Error fetching payslip:", err);
      setError(err.message || "Failed to load payslip");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const authHeader = getAuthHeader();
      if (!authHeader) {
        alert("לא מאומת - אנא התחבר מחדש");
        return;
      }

      console.log(`[PayslipPage] Downloading PDF for payslip: ${payslipId}`);
      
      const response = await fetch(`${API_BASE_URL}/payslips/${payslipId}/pdf`, {
        method: "POST",
        headers: { 
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log(`[PayslipPage] PDF response status: ${response.status}`);

      if (!response.ok) {
        let errorMessage = "Failed to generate PDF";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      console.log(`[PayslipPage] PDF blob size: ${blob.size} bytes`);

      if (blob.size === 0) {
        throw new Error("PDF is empty");
      }

      // Get filename from Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `payslip-${payslipId}.pdf`;
      
      if (contentDisposition) {
        console.log(`[PayslipPage] Content-Disposition: ${contentDisposition}`);
        
        // Try to get filename* (RFC 5987) first - supports UTF-8
        const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
        if (filenameStarMatch && filenameStarMatch[1]) {
          try {
            // Decode percent-encoded UTF-8
            filename = decodeURIComponent(filenameStarMatch[1]);
            console.log(`[PayslipPage] Decoded filename*: ${filename}`);
          } catch (e) {
            console.warn(`[PayslipPage] Failed to decode filename*:`, e);
          }
        } else {
          // Fallback to regular filename parameter
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
            // Decode URI if needed
            try {
              filename = decodeURIComponent(filename);
            } catch (e) {
              // Keep original if decode fails
            }
            console.log(`[PayslipPage] Using filename: ${filename}`);
          }
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Error downloading PDF:", err);
      alert("שגיאה בהורדת PDF: " + (err.message || "Unknown error"));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">טוען תלוש שכר...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || "שגיאה בטעינת תלוש השכר"}</p>
            <button
              onClick={fetchPayslip}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              נסה שוב
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  const monthNames = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
  ];

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto py-6 px-4 print:px-0">
        <PayslipHeader
          month={monthNames[data.payslip.month - 1]}
          year={data.payslip.year}
          companyName={data.company.name}
          companyRegistration={data.company.registration_number}
          canDownloadPDF={data.permissions.can_download_pdf}
          onDownloadPDF={handleDownloadPDF}
          onPrint={handlePrint}
          onBack={() => router.back()}
        />

        <div className="mt-6 space-y-6">
          <EmployeeDetailsCard
            employee={data.employee}
            canEdit={data.permissions.can_edit}
            onEdit={(updated) => {
              // TODO: Implement edit via modal
              console.log("Edit employee:", updated);
            }}
          />

          <EarningsTable earnings={data.earnings} />

          <DeductionsTable deductions={data.deductions} />

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
    </PageShell>
  );
}

