/**
 * Lookup Configuration
 * Central configuration for all lookup dropdowns in the application
 */

export interface LookupConfig {
  key: string;
  type: 'table' | 'fixed';
  tableName?: string;
  valueKey: string; // Column name for value (code)
  labelKey?: string; // Column name for label (description) - for table lookups
  displayFormat?: 'code' | 'description' | 'code-description'; // How to display in dropdown
  options?: Array<{ value: string; label: string }>; // For fixed values
  filter?: Record<string, any>; // Additional filters for table lookups
  customLabelFields?: string[]; // Custom fields to combine for label (e.g., ['maske_name', 'sub_model', 'monthly_car_benefit'])
  searchable?: boolean; // Whether this lookup supports search
  searchFields?: string[]; // Fields to search in when searchable is true
}

export const LOOKUP_CONFIGS: Record<string, LookupConfig> = {
  // Employees
  gender: {
    key: 'gender',
    type: 'fixed',
    valueKey: 'value',
    options: [
      { value: 'MALE', label: 'זכר' },
      { value: 'FEMALE', label: 'נקבה' },
      { value: 'OTHER', label: 'אחר' },
    ],
  },
  city_code: {
    key: 'city_code',
    type: 'table',
    tableName: 'cities',
    valueKey: 'city_code',
    labelKey: 'city_name',
    displayFormat: 'code-description',
  },
  employment_status: {
    key: 'employment_status',
    type: 'fixed',
    valueKey: 'value',
    options: [
      { value: 'EMPLOYEE', label: 'עובד' },
      { value: 'CONTRACTOR', label: 'קבלן' },
    ],
  },
  department_number: {
    key: 'department_number',
    type: 'table',
    tableName: 'departments',
    valueKey: 'department_number',
    labelKey: 'department_name',
    displayFormat: 'code-description',
  },
  site_number: {
    key: 'site_number',
    type: 'table',
    tableName: 'sites',
    valueKey: 'site_number',
    labelKey: 'site_name',
    displayFormat: 'code-description',
  },

  // employees_contracts
  employment_type: {
    key: 'employment_type',
    type: 'fixed',
    valueKey: 'value',
    options: [
      { value: 'MONTHLY', label: 'חודשי' },
      { value: 'HOURLY', label: 'שעתי' },
    ],
  },

  // employees_attendance
  period_id: {
    key: 'period_id',
    type: 'table',
    tableName: 'xlg_pay_periods',
    valueKey: 'period_id',
    labelKey: 'period_description',
    displayFormat: 'code-description',
  },

  // employees_bank_details
  bank_code: {
    key: 'bank_code',
    type: 'table',
    tableName: 'banks',
    valueKey: 'bank_code',
    labelKey: 'bank_name',
    displayFormat: 'code-description',
  },
  branch_code: {
    key: 'branch_code',
    type: 'table',
    tableName: 'banks_branches',
    valueKey: 'branch_code',
    labelKey: 'branch_name',
    displayFormat: 'code-description',
    // Note: This will need to be filtered by bank_code when bank is selected
  },

  // employees_tax
  company_car_benefit_group_id: {
    key: 'company_car_benefit_group_id',
    type: 'table',
    tableName: 'tax_car_benefit',
    valueKey: 'car_id', // Save car_id to company_car_benefit_group_id field
    labelKey: 'make_name', // Primary label field
    displayFormat: 'code-description',
    // Custom display: make_name, sub_model, monthly_car_benefit
    customLabelFields: ['make_name', 'sub_model', 'monthly_car_benefit'],
    searchable: true,
    searchFields: ['make_name', 'sub_model'],
  },

  // employees_pay_items
  item_code: {
    key: 'item_code',
    type: 'table',
    tableName: 'xlg_pay_items',
    valueKey: 'item_code',
    labelKey: 'item_name',
    displayFormat: 'code-description',
  },
};

/**
 * Get lookup configuration by key
 */
export function getLookupConfig(key: string): LookupConfig | undefined {
  return LOOKUP_CONFIGS[key];
}

/**
 * Get all lookup keys
 */
export function getAllLookupKeys(): string[] {
  return Object.keys(LOOKUP_CONFIGS);
}

