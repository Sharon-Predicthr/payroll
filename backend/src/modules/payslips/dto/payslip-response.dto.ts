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
}

