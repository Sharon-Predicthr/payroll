/**
 * DTO for saving all employee data in a single transaction
 */

export interface SaveEmployeeMasterDto {
  [key: string]: any; // Fields from employees table
}

export interface SaveEmployeeTaxDto {
  [key: string]: any; // Fields from employees_tax table
}

export interface SaveEmployeeContractDto {
  contract_id?: number;
  [key: string]: any;
}

export interface SaveEmployeeAttendanceDto {
  attendance_id?: number;
  [key: string]: any;
}

export interface SaveEmployeeBankDetailDto {
  bank_detail_id?: number;
  [key: string]: any;
}

export interface SaveEmployeePensionDto {
  emp_pension_id?: number;
  [key: string]: any;
}

export interface SaveEmployeePayItemDto {
  pay_item_id?: number;
  [key: string]: any;
}

export interface SaveEmployeeChangesDto {
  created?: any[];
  updated?: any[];
  deleted?: (number | string)[];
}

export class SaveEmployeeDto {
  master?: SaveEmployeeMasterDto;
  tax?: SaveEmployeeTaxDto;
  contracts?: SaveEmployeeChangesDto;
  attendance?: SaveEmployeeChangesDto;
  bank_details?: SaveEmployeeChangesDto;
  pension?: SaveEmployeeChangesDto;
  pay_items?: SaveEmployeeChangesDto;
}

