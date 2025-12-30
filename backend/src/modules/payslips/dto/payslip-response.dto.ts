export class PayslipEarningDto {
  code: string;
  description: string;
  quantity: number;
  rate: number;
  taxable_value: number;
  amount: number;
  explanation?: string;
}

export class PayslipDeductionDto {
  description: string;
  amount: number;
}

export class PayslipTotalsDto {
  total_earnings: number;
  total_deductions: number;
  net_salary: number;
  taxable_salary: number;
  insured_salary: number;
  tax_percentage: number;
  credit_points: number;
}

export class PayslipAttendanceDto {
  work_days: number;
  work_hours: number;
  absence_days: number;
}

export class PayslipBalanceDto {
  previous_balance: number;
  accrued: number;
  used: number;
  new_balance: number;
}

export class PayslipBalancesDto {
  vacation: PayslipBalanceDto;
  sick: PayslipBalanceDto;
}

export class PayslipEmployeeDto {
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

export class PayslipCompanyDto {
  name: string;
  registration_number: string;
}

export class PayslipMetaDto {
  id: string;
  month: number;
  year: number;
  generation_date: string;
  version: string;
}

export class PayslipPermissionsDto {
  can_edit: boolean;
  can_download_pdf: boolean;
}

export class PayslipAdditionalDataDto {
  // General Information (מידע כללי)
  general_info?: {
    department_number?: string;
    department_name?: string;
    employee_address?: string;
    employee_national_id?: string;
    tariff_monthly?: number;
    tariff_daily?: number;
    tariff_hourly?: number;
    standard_hours_per_month?: number;
    start_of_work?: string;
    seniority_years?: number;
    seniority_months?: number;
    job_pct?: number;
    partial_period_pct?: number;
    tax_credit_points?: number;
    tax_pct_level?: number;
    ytd_months_of_work?: number;
    employer_tax_file_number?: string;
    employer_national_insurance_number?: string;
    bank_code?: string;
    branch_code?: string;
    account_number?: string;
  };

  // Monthly Tax Information (מידע מס חודשי)
  monthly_tax_info?: {
    tax_credit_points?: number;
    tax_pct_level?: number;
    severance_monthly?: number;
    severance_gross_monthly?: number;
    kpg_employer_monthly?: number;
    kpg_gross_monthly?: number;
    khs_employer_monthly?: number;
    khs_gross_monthly?: number;
    city_tax_credit_month?: number;
    seif_47_exempt_month?: number;
    shovi_monthly?: number;
  };

  // Yearly/Accumulated Information (מידע שנתי/מצטבר)
  yearly_accumulated_info?: {
    ytd_gross_payments?: number;
    ytd_shovi?: number;
    ytd_gross_for_tax?: number;
    ytd_tax?: number;
    ytd_bl_employee?: number;
    ytd_bl_employer?: number;
    ytd_health_employee?: number;
    ytd_health_employer?: number;
    ytd_35_tax_exempt?: number;
    ytd_khs_employer?: number;
    ytd_khs_employee?: number;
    ytd_47_tax_deduction?: number;
    ytd_pension_employer?: number;
    ytd_pension_employee?: number;
    ytd_severance_employer?: number;
  };
  
  // Employee additional data (נתונים עובדים) - kept for backward compatibility
  employee_data?: {
    work_days_in_company?: number;
    work_hours_in_company?: number;
    salary_taxable?: number;
    salary_national_insurance?: number;
    salary_insured?: number;
    base_hourly_rate?: number;
    national_insurance_base?: number;
    monthly_minimum_salary?: number;
    hourly_minimum_salary?: number;
    [key: string]: any;
  };
  
  // Direct data (נתונים ישירים) - kept for backward compatibility
  direct_data?: {
    direct_work_days?: number;
    direct_work_hours?: number;
    direct_work_hours_attested?: number;
    hours_per_day?: number;
    regular_credit_points?: number;
    marginal_tax_percentage?: number;
    version_code?: string;
    cumulative_calculation?: string;
    payment_method?: string;
    [key: string]: any;
  };
  
  // Additional custom fields
  custom_fields?: Array<{
    label: string;
    value: string | number;
    category?: 'employee' | 'direct' | 'other' | 'general' | 'monthly_tax' | 'yearly';
  }>;
}

export class PayslipResponseDto {
  payslip: PayslipMetaDto;
  company: PayslipCompanyDto;
  employee: PayslipEmployeeDto;
  earnings: PayslipEarningDto[];
  deductions: PayslipDeductionDto[]; // For backward compatibility
  mandatory_deductions?: PayslipDeductionDto[]; // Mandatory deductions (item_type IN ('2-DEDUCTION', '3-INSURANCE', '4-KH-EDUCATION'))
  personal_deductions?: PayslipDeductionDto[]; // Personal/Optional deductions (item_type = '5-DEDUCTION')
  totals: PayslipTotalsDto;
  attendance: PayslipAttendanceDto;
  balances: PayslipBalancesDto;
  permissions: PayslipPermissionsDto;
  additional_data?: PayslipAdditionalDataDto; // Additional information fields
}

