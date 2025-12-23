"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { PageShell } from "@/components/PageShell";
import { getAuthHeader, isAuthenticated } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CreatePayslipDialog } from "./components/CreatePayslipDialog";
import { DataGrid, GridColumn } from "@/components/DataGrid";

const API_BASE_URL = "/api";

interface PayslipListItem {
  id: string;
  month: number;
  year: number;
  employee_name: string;
  employee_id: string;
  net_salary: number;
  generation_date: string;
}

export default function PayslipsListPage() {
  const router = useRouter();
  const locale = useLocale();
  const [payslips, setPayslips] = useState<PayslipListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push(`/${locale}/login`);
      return;
    }

    fetchPayslips();
  }, [locale, router]);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      setError(null);

      const authHeader = getAuthHeader();
      if (!authHeader) {
        router.push(`/${locale}/login`);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/payslips`, {
        headers: { Authorization: authHeader },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch payslips (${response.status})`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setPayslips(result.data);
      } else {
        setPayslips([]);
      }
    } catch (err: any) {
      console.error("Error fetching payslips:", err);
      setError(err.message || "Failed to load payslips");
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
  ];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("he-IL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">טוען תלושי שכר...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">תלושי שכר</h1>
            <p className="text-sm text-gray-600">צפה וניהול תלושי שכר</p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            צור תלוש שכר
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {payslips.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">אין תלושי שכר</h3>
            <p className="text-sm text-gray-500 mb-4">
              עדיין לא נוצרו תלושי שכר. תלושי שכר יופיעו כאן לאחר ריצת משכורות.
            </p>
          </div>
        ) : (
          <DataGrid
            data={payslips}
            columns={[
              {
                id: "month",
                label: "חודש",
                defaultWidth: 150,
                sortable: true,
                resizable: true,
                accessor: (row) => `${monthNames[row.month - 1]} ${row.year}`,
                render: (value, row) => (
                  <span className="text-sm text-gray-900">
                    {monthNames[row.month - 1]} {row.year}
                  </span>
                ),
              },
              {
                id: "employee_name",
                label: "עובד",
                defaultWidth: 200,
                sortable: true,
                resizable: true,
                accessor: (row) => row.employee_name,
                render: (value) => (
                  <span className="text-sm text-gray-900">{value}</span>
                ),
              },
              {
                id: "employee_id",
                label: "מזהה עובד",
                defaultWidth: 120,
                sortable: true,
                resizable: true,
                accessor: (row) => row.employee_id,
                render: (value) => (
                  <span className="text-sm text-gray-600">{value}</span>
                ),
              },
              {
                id: "net_salary",
                label: "שכר נטו",
                defaultWidth: 150,
                sortable: true,
                resizable: true,
                accessor: (row) => row.net_salary,
                render: (value) => (
                  <span className="text-sm font-semibold text-gray-900 font-mono">
                    ₪{formatNumber(value)}
                  </span>
                ),
              },
              {
                id: "generation_date",
                label: "תאריך יצירה",
                defaultWidth: 150,
                sortable: true,
                resizable: true,
                accessor: (row) => new Date(row.generation_date).getTime(),
                render: (value, row) => (
                  <span className="text-sm text-gray-600">
                    {new Date(row.generation_date).toLocaleDateString("he-IL")}
                  </span>
                ),
              },
              {
                id: "actions",
                label: "פעולות",
                defaultWidth: 100,
                sortable: false,
                resizable: true,
                accessor: () => "",
                render: (value, row) => (
                  <Button
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/${locale}/payslip/${row.id}`, '_blank');
                    }}
                  >
                    צפה
                  </Button>
                ),
              },
            ]}
            gridId="payslips"
            onRowClick={(row) => window.open(`/${locale}/payslip/${row.id}`, '_blank')}
            emptyMessage="אין תלושי שכר להצגה"
          />
        )}

        {showCreateDialog && (
          <CreatePayslipDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onSuccess={() => {
              setShowCreateDialog(false);
              fetchPayslips();
            }}
          />
        )}
      </div>
    </PageShell>
  );
}

