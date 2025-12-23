export class ProcessPayrollDto {
  employee_id?: string; // Optional - if not provided, process all employees
  employee_ids?: string[]; // Optional - array of employee IDs for batch processing
  period_id: string; // Required - the payroll period ID (e.g., '2025-02')
  process_all?: boolean; // If true, process all employees in the tenant
}

