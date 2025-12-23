export class CreatePayrollPeriodDto {
  period_id: string; // Format: 'YYYY-MM' (e.g., '2025-02')
  start_date: Date | string;
  end_date: Date | string;
  pay_date?: Date | string; // Optional
  tax_year?: number; // Optional
  is_closed?: boolean; // Optional, default: false
}

