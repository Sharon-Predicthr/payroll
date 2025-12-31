export class AddEmployeeDto {
  // Mandatory fields
  employee_id: string;
  tz_id: string;
  first_name: string;
  last_name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  date_of_birth: string; // ISO date string
  hire_date: string; // ISO date string
  employment_status: 'EMPLOYEE' | 'CONTRACTOR';
  department_number: number;

  // Optional fields
  employment_percent?: number;
  address_line1?: string;
  address_line2?: string;
  city_code?: number;
  zip_code?: string;
  cell_phone_number?: string;
  email?: string;
  termination_date?: string | null;
  job_title?: string;
  site_number?: number;
  manager_id?: string;
  is_active?: boolean;
}

