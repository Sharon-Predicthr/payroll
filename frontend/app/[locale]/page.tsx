"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from 'next-intl';
import { PageShell } from "@/components/PageShell";
import { DashboardChart } from "@/components/DashboardChart";
import { DashboardSelectableChart } from "@/components/DashboardSelectableChart";
import { usePayrollPeriod } from "@/contexts/PayrollPeriodContext";
import { getAuthHeader } from "@/lib/auth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface DashboardKPIs {
  employees_paid: number;
  gross_payroll_month: number;
  average_payroll_month: number;
  average_tariff_daily: number;
  average_job_percent: number;
  vacation_balance_debit: number;
  sick_balance_debit: number;
  havraa_balance_debit: number;
  employer_cost_month: number;
  employer_cost_without_hr_month: number;
  employer_cost_with_hr_month: number;
  gross_net_payment_month: number;
  average_net_payment_month: number;
  audit_errors: number;
  audit_warnings: number;
}

interface DepartmentBreakdown {
  department_number: number;
  department_name: string;
  employees_paid: number;
  gross_payroll_month: number;
  average_payroll_month: number;
  average_tariff_daily: number;
  average_job_percent: number;
  vacation_balance_debit: number;
  sick_balance_debit: number;
  havraa_balance_debit: number;
  employer_cost_month: number;
  employer_cost_with_hr_month: number;
  gross_net_payment_month: number;
  average_net_payment_month: number;
}

interface CostsTrend {
  period_id: string;
  employees_paid: number;
  gross_payroll_month: number;
  average_payroll_month: number;
  average_tariff_daily: number;
  average_job_percent: number;
  vacation_balance_debit: number;
  sick_balance_debit: number;
  havraa_balance_debit: number;
  employer_cost_month: number;
  employer_cost_with_hr_month: number;
  gross_net_payment_month: number;
  average_net_payment_month: number;
}

// Format currency values
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format percentage values
const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

export default function DashboardPage() {
  const { selectedPeriod } = usePayrollPeriod();
  const [kpis, setKPIs] = useState<DashboardKPIs | null>(null);
  const [departmentBreakdown, setDepartmentBreakdown] = useState<DepartmentBreakdown[]>([]);
  const [costsTrends, setCostsTrends] = useState<CostsTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all dashboard data in parallel
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!selectedPeriod?.period_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const authHeader = getAuthHeader();
        if (!authHeader) {
          throw new Error("לא מאומת - נא להתחבר מחדש");
        }

        const periodId = selectedPeriod.period_id;

        // Fetch all 3 endpoints in parallel for faster loading
        const [kpisResponse, departmentsResponse, trendsResponse] = await Promise.all([
          fetch(`/api/dashboard/kpis?period_id=${encodeURIComponent(periodId)}`, {
            headers: { Authorization: authHeader },
          }),
          fetch(`/api/dashboard/departments?period_id=${encodeURIComponent(periodId)}`, {
            headers: { Authorization: authHeader },
          }),
          fetch(`/api/dashboard/trends?period_id=${encodeURIComponent(periodId)}`, {
            headers: { Authorization: authHeader },
          }),
        ]);

        // Handle KPIs response
        if (!kpisResponse.ok) {
          const errorData = await kpisResponse.json().catch(() => ({}));
          throw new Error(errorData.message || "שגיאה בטעינת KPIs");
        }
        const kpisData = await kpisResponse.json();
        if (kpisData.success && kpisData.data) {
          setKPIs(kpisData.data);
        }

        // Handle Departments response
        if (!departmentsResponse.ok) {
          const errorData = await departmentsResponse.json().catch(() => ({}));
          console.error("Error fetching departments:", errorData);
        } else {
          const departmentsData = await departmentsResponse.json();
          if (departmentsData.success && departmentsData.data) {
            setDepartmentBreakdown(departmentsData.data);
          }
        }

        // Handle Trends response
        if (!trendsResponse.ok) {
          const errorData = await trendsResponse.json().catch(() => ({}));
          console.error("Error fetching trends:", errorData);
        } else {
          const trendsData = await trendsResponse.json();
          if (trendsData.success && trendsData.data) {
            setCostsTrends(trendsData.data);
          }
        }

        setLoading(false);
      } catch (err: any) {
        console.error('[DashboardPage] Error fetching dashboard data:', err);
        setError(err.message || 'שגיאה בטעינת נתוני הדשבורד');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedPeriod?.period_id]);

  // Prepare KPIs chart data
  const kpisChartData = useMemo(() => {
    if (!kpis) return [];

    return [
      { label: 'עובדים משולמים', value: kpis.employees_paid, color: 'bg-blue-500' },
      { label: 'משכורת ברוטו', value: kpis.gross_payroll_month, color: 'bg-green-500' },
      { label: 'ממוצע שכר', value: kpis.average_payroll_month, color: 'bg-purple-500' },
      { label: 'ממוצע תעריף יומי', value: kpis.average_tariff_daily, color: 'bg-yellow-500' },
      { label: 'ממוצע אחוז משרה', value: kpis.average_job_percent, color: 'bg-pink-500' },
      { label: 'חוב חופשה', value: kpis.vacation_balance_debit, color: 'bg-orange-500' },
      { label: 'חוב מחלה', value: kpis.sick_balance_debit, color: 'bg-red-500' },
      { label: 'חוב הבראה', value: kpis.havraa_balance_debit, color: 'bg-teal-500' },
      { label: 'עלות מעביד', value: kpis.employer_cost_month, color: 'bg-indigo-500' },
      { label: 'עלות מעביד ללא HR', value: kpis.employer_cost_without_hr_month, color: 'bg-cyan-500' },
      { label: 'עלות מעביד כולל HR', value: kpis.employer_cost_with_hr_month, color: 'bg-lime-500' },
      { label: 'תשלום נטו', value: kpis.gross_net_payment_month, color: 'bg-emerald-500' },
      { label: 'ממוצע נטו', value: kpis.average_net_payment_month, color: 'bg-violet-500' },
      { label: 'שגיאות ביקורת', value: kpis.audit_errors, color: 'bg-rose-500' },
      { label: 'אזהרות ביקורת', value: kpis.audit_warnings, color: 'bg-amber-500' },
    ];
  }, [kpis]);

  // Prepare department breakdown chart data
  const departmentChartData = useMemo(() => {
    return departmentBreakdown.map(dept => ({
      label: dept.department_name || `מחלקה ${dept.department_number}`,
      employees_paid: dept.employees_paid,
      gross_payroll_month: dept.gross_payroll_month,
      average_payroll_month: dept.average_payroll_month,
      average_tariff_daily: dept.average_tariff_daily,
      average_job_percent: dept.average_job_percent,
      vacation_balance_debit: dept.vacation_balance_debit,
      sick_balance_debit: dept.sick_balance_debit,
      havraa_balance_debit: dept.havraa_balance_debit,
      employer_cost_month: dept.employer_cost_month,
      employer_cost_with_hr_month: dept.employer_cost_with_hr_month,
      gross_net_payment_month: dept.gross_net_payment_month,
      average_net_payment_month: dept.average_net_payment_month,
    }));
  }, [departmentBreakdown]);

  // Prepare trends chart data
  const trendsChartData = useMemo(() => {
    return costsTrends.map(trend => ({
      label: trend.period_id,
      employees_paid: trend.employees_paid,
      gross_payroll_month: trend.gross_payroll_month,
      average_payroll_month: trend.average_payroll_month,
      average_tariff_daily: trend.average_tariff_daily,
      average_job_percent: trend.average_job_percent,
      vacation_balance_debit: trend.vacation_balance_debit,
      sick_balance_debit: trend.sick_balance_debit,
      havraa_balance_debit: trend.havraa_balance_debit,
      employer_cost_month: trend.employer_cost_month,
      employer_cost_with_hr_month: trend.employer_cost_with_hr_month,
      gross_net_payment_month: trend.gross_net_payment_month,
      average_net_payment_month: trend.average_net_payment_month,
    }));
  }, [costsTrends]);

  // Format value for KPIs chart (mix of currency, numbers, and percentages)
  const formatKPIsValue = (value: number, index: number) => {
    // Index-based formatting (matching the order in kpisChartData)
    // 0: employees_paid (number)
    // 1: gross_payroll_month (currency)
    // 2: average_payroll_month (currency)
    // 3: average_tariff_daily (currency)
    // 4: average_job_percent (percent)
    // 5-7: vacation/sick/havraa_balance_debit (currency)
    // 8-10: employer_cost_* (currency)
    // 11-12: gross/average_net_payment_month (currency)
    // 13-14: audit_errors/warnings (number)

    const currencyIndices = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12];
    const percentIndices = [4];
    
    if (percentIndices.includes(index)) {
      return formatPercent(value);
    } else if (currencyIndices.includes(index)) {
      return formatCurrency(value);
    } else {
      return value.toLocaleString();
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-text-muted">טוען נתוני דשבורד...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-800">{error}</p>
        </div>
      </PageShell>
    );
  }

  if (!selectedPeriod) {
    return (
      <PageShell>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-yellow-800">נא לבחור תקופת שכר להצגת הדשבורד</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-main">דשבורד</h1>
            <p className="text-text-muted mt-1">
              תקופת שכר: {selectedPeriod.period_description || selectedPeriod.period_id}
            </p>
          </div>
        </div>

        {/* KPIs Chart */}
        <DashboardChart
          title="מדדי ביצועים מרכזיים"
          data={kpisChartData}
          height={400}
          formatValue={(value, index) => {
            if (index !== undefined) {
              return formatKPIsValue(value, index);
            }
            // Fallback: try to find index by value
            const dataIndex = kpisChartData.findIndex(d => d.value === value);
            if (dataIndex >= 0) {
              return formatKPIsValue(value, dataIndex);
            }
            return value.toLocaleString();
          }}
        />

        {/* Department Breakdown Chart */}
        <DashboardSelectableChart
          title="פילוח לפי מחלקות"
          data={departmentChartData}
          metrics={[
            { key: 'employees_paid', label: 'מספר עובדים משולמים', formatValue: (v) => v.toLocaleString() },
            { key: 'gross_payroll_month', label: 'משכורת ברוטו', formatValue: formatCurrency },
            { key: 'average_payroll_month', label: 'ממוצע שכר', formatValue: formatCurrency },
            { key: 'average_tariff_daily', label: 'ממוצע תעריף יומי', formatValue: formatCurrency },
            { key: 'average_job_percent', label: 'ממוצע אחוז משרה', formatValue: formatPercent },
            { key: 'vacation_balance_debit', label: 'חוב חופשה', formatValue: formatCurrency },
            { key: 'sick_balance_debit', label: 'חוב מחלה', formatValue: formatCurrency },
            { key: 'havraa_balance_debit', label: 'חוב הבראה', formatValue: formatCurrency },
            { key: 'employer_cost_month', label: 'עלות מעביד', formatValue: formatCurrency },
            { key: 'employer_cost_with_hr_month', label: 'עלות מעביד כולל HR', formatValue: formatCurrency },
            { key: 'gross_net_payment_month', label: 'תשלום נטו', formatValue: formatCurrency },
            { key: 'average_net_payment_month', label: 'ממוצע נטו', formatValue: formatCurrency },
          ]}
          defaultMetric="gross_payroll_month"
          height={400}
        />

        {/* Costs Trends Chart */}
        <DashboardSelectableChart
          title="מגמות עלויות (12 תקופות אחרונות)"
          data={trendsChartData}
          metrics={[
            { key: 'employees_paid', label: 'מספר עובדים משולמים', formatValue: (v) => v.toLocaleString() },
            { key: 'gross_payroll_month', label: 'משכורת ברוטו', formatValue: formatCurrency },
            { key: 'average_payroll_month', label: 'ממוצע שכר', formatValue: formatCurrency },
            { key: 'average_tariff_daily', label: 'ממוצע תעריף יומי', formatValue: formatCurrency },
            { key: 'average_job_percent', label: 'ממוצע אחוז משרה', formatValue: formatPercent },
            { key: 'vacation_balance_debit', label: 'חוב חופשה', formatValue: formatCurrency },
            { key: 'sick_balance_debit', label: 'חוב מחלה', formatValue: formatCurrency },
            { key: 'havraa_balance_debit', label: 'חוב הבראה', formatValue: formatCurrency },
            { key: 'employer_cost_month', label: 'עלות מעביד', formatValue: formatCurrency },
            { key: 'employer_cost_with_hr_month', label: 'עלות מעביד כולל HR', formatValue: formatCurrency },
            { key: 'gross_net_payment_month', label: 'תשלום נטו', formatValue: formatCurrency },
            { key: 'average_net_payment_month', label: 'ממוצע נטו', formatValue: formatCurrency },
          ]}
          defaultMetric="gross_payroll_month"
          height={400}
        />
      </div>
    </PageShell>
  );
}
