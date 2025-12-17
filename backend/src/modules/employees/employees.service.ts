import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { BaseTenantService } from '../../common/services/base-tenant.service';
import { TenantResolverService } from '../auth/tenant-resolver.service';
import { SaveEmployeeDto } from './dto/save-employee.dto';
import * as sql from 'mssql';

export interface Employee {
  id: string;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  department_id?: string;
  position?: string;
  status?: string;
  hire_date?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface EmployeeBankDetail {
  id: string;
  employee_id: string;
  bank_name?: string;
  account_number?: string;
  branch_code?: string;
  account_type?: string;
  is_primary?: boolean;
}

export interface EmployeePayItem {
  id: string;
  employee_id: string;
  pay_item_type?: string; // 'Earning' or 'Deduction'
  item_name?: string;
  amount?: number;
  is_active?: boolean;
}

export interface EmployeePensionProfile {
  id: string;
  employee_id: string;
  pension_provider?: string;
  pension_number?: string;
  contribution_rate?: number;
  employer_contribution_rate?: number;
}

export interface EmployeeTaxProfile {
  id: string;
  employee_id: string;
  tax_id?: string;
  filing_status?: string;
  exemptions?: number;
  additional_withholding?: number;
}

export interface EmployeeAttendance {
  id: string;
  employee_id: string;
  date?: Date;
  check_in?: Date;
  check_out?: Date;
  hours_worked?: number;
  status?: string; // 'Present', 'Absent', 'Late', etc.
}

export interface EmployeeContract {
  id: string;
  employee_id: string;
  contract_type?: string;
  start_date?: Date;
  end_date?: Date;
  salary?: number;
  status?: string;
}

export interface EmployeeLeaveBalance {
  id: string;
  employee_id: string;
  leave_type?: string;
  balance?: number;
  used?: number;
  available?: number;
  year?: number;
}

export interface EmployeeDetail extends Employee {
  bank_details?: EmployeeBankDetail[];
  pay_items?: EmployeePayItem[];
  pension_profile?: EmployeePensionProfile | EmployeePensionProfile[];
  tax_profile?: EmployeeTaxProfile;
  attendance?: EmployeeAttendance[];
  contracts?: EmployeeContract[];
  leave_balances?: EmployeeLeaveBalance[];
}

@Injectable()
export class EmployeesService extends BaseTenantService {
  private readonly logger = new Logger(EmployeesService.name);
  constructor(tenantResolver: TenantResolverService) {
    super(tenantResolver);
  }

  /**
   * Get all employees (master list) with pagination
   */
  async getEmployees(tenantCode: string, page: number = 1, limit: number = 20): Promise<{ employees: Employee[]; total: number; page: number; limit: number; totalPages: number }> {
    console.log('[EmployeesService] getEmployees called for tenant:', tenantCode);
    
    const pool = await this.getTenantPool(tenantCode);
    console.log('[EmployeesService] Got tenant pool');

    try {
      // First, let's check what columns actually exist in the employees table
      const schemaResult = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME, DATA_TYPE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'employees'
          ORDER BY ORDINAL_POSITION
        `);
      
      console.log('[EmployeesService] Actual columns in employees table:');
      schemaResult.recordset.forEach((col: any) => {
        console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      });

      // Get total count
      const countResult = await pool
        .request()
        .query(`
          SELECT COUNT(*) as total
          FROM employees
          WHERE is_active = 1
        `);
      
      const total = countResult.recordset[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;

      // Now query with pagination
      console.log('[EmployeesService] Executing query with pagination...', { page, limit, offset });
      const result = await pool
        .request()
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT *
          FROM employees
          WHERE is_active = 1
          ORDER BY first_name, last_name, employee_id
          OFFSET @offset ROWS
          FETCH NEXT @limit ROWS ONLY
        `);

      console.log('[EmployeesService] Query result count:', result.recordset.length);

      const employees = result.recordset.map((row: any) => {
        // Map actual database columns to our interface
        // Based on the actual schema:
        // - employee_id (not id, not employee_code)
        // - cell_phone_number (not phone)
        // - department_number (not department_id)
        // - job_title (not position)
        // - employment_status (not status)
        const employee: Employee = {
          id: row.employee_id || row.ID || row.EmployeeID || '',
          employee_code: row.employee_id || row.tz_id || undefined, // Use employee_id as code if no separate code exists
          first_name: row.first_name || undefined,
          last_name: row.last_name || undefined,
          full_name: (row.first_name && row.last_name) 
            ? `${row.first_name} ${row.last_name}`.trim()
            : row.first_name || row.last_name || row.employee_id || 'N/A',
          email: row.email || undefined,
          phone: row.cell_phone_number || undefined,
          department_id: row.department_number ? String(row.department_number) : undefined,
          position: row.job_title || undefined,
          status: row.employment_status || undefined,
          hire_date: row.hire_date || undefined,
          created_at: undefined, // Not in schema
          updated_at: undefined, // Not in schema
        };
        return employee;
      });

      return {
        employees,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.error('[EmployeesService] Error fetching employees:', error);
      console.error('[EmployeesService] Error details:', error.message);
      throw error;
    }
  }

  /**
   * Get employee by ID with all related data
   */
  async getEmployeeById(tenantCode: string, employeeId: string): Promise<EmployeeDetail> {
    const pool = await this.getTenantPool(tenantCode);

    try {
      // Get basic employee info - use SELECT * to get all columns
      const employeeResult = await pool
        .request()
        .input('employeeId', sql.NVarChar, employeeId)
        .query(`
          SELECT *
          FROM employees
          WHERE employee_id = @employeeId AND is_active = 1
        `);

      if (employeeResult.recordset.length === 0) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
      }

      const row = employeeResult.recordset[0];
      
      // Return ALL columns from the database, not just mapped ones
      // This ensures all fields (tz_id, gender, date_of_birth, address_line1, etc.) are available
      const employee: any = {
        // Map required Employee interface fields
        id: row.employee_id || '',
        employee_code: row.employee_id || row.tz_id || undefined,
        first_name: row.first_name || undefined,
        last_name: row.last_name || undefined,
        full_name: (row.first_name && row.last_name) 
          ? `${row.first_name} ${row.last_name}`.trim()
          : row.first_name || row.last_name || row.employee_id || 'N/A',
        email: row.email || undefined,
        phone: row.cell_phone_number || undefined,
        department_id: row.department_number ? String(row.department_number) : undefined,
        position: row.job_title || undefined,
        status: row.employment_status || undefined,
        hire_date: row.hire_date || undefined,
        created_at: undefined, // Not in schema
        updated_at: undefined, // Not in schema
        // Include ALL other fields from the database row
        // Note: department_number is included here (not excluded) because we need it for the lookup
        ...Object.keys(row).reduce((acc, key) => {
          // Only add fields that weren't already mapped above
          // Exclude: employee_id (mapped to id), first_name, last_name (mapped to full_name), 
          // email, cell_phone_number (mapped to phone), job_title (mapped to position), 
          // employment_status (mapped to status), hire_date
          // DO NOT exclude department_number - we need it for the lookup!
          if (!['employee_id', 'first_name', 'last_name', 'email', 'cell_phone_number', 'job_title', 'employment_status', 'hire_date'].includes(key)) {
            acc[key] = row[key];
          }
          return acc;
        }, {} as any),
      };

      // Get all related data in parallel
      const [
        bankDetails,
        payItems,
        pensionProfile,
        taxProfile,
        attendance,
        contracts,
        leaveBalances,
      ] = await Promise.all([
        this.getBankDetails(pool, employeeId),
        this.getPayItems(pool, employeeId),
        this.getPensionProfile(pool, employeeId),
        this.getTaxProfile(pool, employeeId),
        this.getAttendance(pool, employeeId),
        this.getContracts(pool, employeeId),
        this.getLeaveBalances(pool, employeeId),
      ]);

      return {
        ...employee,
        bank_details: bankDetails,
        pay_items: payItems,
        pension_profile: pensionProfile,
        tax_profile: taxProfile,
        attendance: attendance,
        contracts: contracts,
        leave_balances: leaveBalances,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching employee details:', error);
      throw error;
    }
  }

  /**
   * Get bank details for an employee
   */
  private async getBankDetails(
    pool: sql.ConnectionPool,
    employeeId: string,
  ): Promise<EmployeeBankDetail[]> {
    try {
      // Get column names first to determine sort columns
      const columnCheck = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'employees_bank_details'
          ORDER BY ORDINAL_POSITION
        `);
      
      const columns = columnCheck.recordset.map((r: any) => r.COLUMN_NAME);
      const hasIsPrimary = columns.some((c: string) => c.toLowerCase().includes('is_primary') || c.toLowerCase() === 'is_primary');
      const hasBankName = columns.some((c: string) => c.toLowerCase().includes('bank_name') || c.toLowerCase() === 'bank_name');
      
      const orderBy = hasIsPrimary && hasBankName 
        ? 'is_primary DESC, bank_name'
        : hasBankName 
        ? 'bank_name'
        : columns[0];
      
      const result = await pool
        .request()
        .input('employeeId', sql.NVarChar, employeeId)
        .query(`
          SELECT *
          FROM employees_bank_details
          WHERE employee_id = @employeeId
          ORDER BY ${orderBy}
        `);

      // Log available columns for debugging
      if (result.recordset.length > 0) {
        console.log('[getBankDetails] Available columns:', Object.keys(result.recordset[0]));
      }

      return result.recordset.map((row: any) => {
        const mapped: any = { ...row }; // Keep all original columns
        // Map to expected field names
        Object.keys(row).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('bank_name') || lowerKey === 'bank_name') mapped.bank_name = row[key];
          if (lowerKey.includes('account_number') || lowerKey === 'account_number') mapped.account_number = row[key];
          if (lowerKey.includes('branch_code') || lowerKey === 'branch_code') mapped.branch_code = row[key];
          if (lowerKey.includes('account_type') || lowerKey === 'account_type') mapped.account_type = row[key];
          if (lowerKey.includes('is_primary') || lowerKey === 'is_primary') mapped.is_primary = row[key];
        });
        return mapped;
      });
    } catch (error) {
      console.error('Error fetching bank details:', error);
      return [];
    }
  }

  /**
   * Get pay items for an employee
   */
  private async getPayItems(
    pool: sql.ConnectionPool,
    employeeId: string,
  ): Promise<EmployeePayItem[]> {
    try {
      // Get column names first to determine sort columns
      const columnCheck = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'employees_pay_items'
          ORDER BY ORDINAL_POSITION
        `);
      
      const columns = columnCheck.recordset.map((r: any) => r.COLUMN_NAME);
      console.log('[getPayItems] Available columns for sorting:', columns);
      
      // Find appropriate sort columns - use pay_item_name or item_code, not item_name
      const hasPayItemName = columns.some((c: string) => c.toLowerCase().includes('pay_item_name') || c.toLowerCase() === 'pay_item_name');
      const hasItemCode = columns.some((c: string) => c.toLowerCase().includes('item_code') || c.toLowerCase() === 'item_code');
      
      const orderBy = hasItemCode 
        ? 'item_code'
        : hasPayItemName 
        ? 'pay_item_name'
        : columns[0] || 'pay_item_id';
      
      const result = await pool
        .request()
        .input('employeeId', sql.NVarChar, employeeId)
        .query(`
          SELECT *
          FROM employees_pay_items
          WHERE employee_id = @employeeId
          ORDER BY ${orderBy}
        `);

      // Log available columns for debugging
      if (result.recordset.length > 0) {
        console.log('[getPayItems] Available columns:', Object.keys(result.recordset[0]));
      }

      return result.recordset.map((row: any) => {
        const mapped: any = { ...row }; // Keep all original columns
        // Map to expected field names
        Object.keys(row).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('pay_item_type') || lowerKey === 'pay_item_type') mapped.pay_item_type = row[key];
          if (lowerKey.includes('item_name') || lowerKey === 'item_name') mapped.item_name = row[key];
          if (lowerKey.includes('amount') || lowerKey === 'amount') mapped.amount = row[key];
          if (lowerKey.includes('is_active') || lowerKey === 'is_active') mapped.is_active = row[key];
        });
        return mapped;
      });
    } catch (error) {
      console.error('Error fetching pay items:', error);
      return [];
    }
  }

  /**
   * Get pension profile for an employee
   */
  private async getPensionProfile(
    pool: sql.ConnectionPool,
    employeeId: string,
  ): Promise<EmployeePensionProfile[]> {
    try {
      const result = await pool
        .request()
        .input('employeeId', sql.NVarChar, employeeId)
        .query(`
          SELECT *
          FROM employees_pension
          WHERE employee_id = @employeeId
          ORDER BY emp_pension_id
        `);

      // Log available columns for debugging
      if (result.recordset.length > 0) {
        console.log('[getPensionProfile] Available columns:', Object.keys(result.recordset[0]));
        console.log('[getPensionProfile] Number of rows:', result.recordset.length);
      }

      // Return array of all pension records (employees_pension can have multiple rows)
      // Columns: emp_pension_id, pension_fund_name, pension_policy_no, pension_is_amount_based, 
      // employer_pension_pct, employee_pension_pct, employer_severance_pct, etc.
      return result.recordset.map((row: any) => ({ ...row }));
    } catch (error) {
      console.error('Error fetching pension profile:', error);
      return [];
    }
  }

  /**
   * Get tax profile for an employee
   */
  private async getTaxProfile(
    pool: sql.ConnectionPool,
    employeeId: string,
  ): Promise<EmployeeTaxProfile | null> {
    try {
      const result = await pool
        .request()
        .input('employeeId', sql.NVarChar, employeeId)
        .query(`
          SELECT *
          FROM employees_tax
          WHERE employee_id = @employeeId
        `);

      // Log available columns for debugging
      if (result.recordset.length > 0) {
        console.log('[getTaxProfile] Available columns:', Object.keys(result.recordset[0]));
      }

      if (result.recordset.length === 0) {
        return null;
      }

      // Return all columns as-is (employees_tax has: is_resident, company_car_benefit_group_id, additional_credit_points, etc.)
      const row = result.recordset[0];
      return { ...row }; // Return all original columns
    } catch (error) {
      console.error('Error fetching tax profile:', error);
      return null;
    }
  }

  /**
   * Get attendance records for an employee
   */
  private async getAttendance(
    pool: sql.ConnectionPool,
    employeeId: string,
    limit: number = 30,
  ): Promise<EmployeeAttendance[]> {
    try {
      // Get column names first to determine sort column
      const columnCheck = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'employees_attendance'
          ORDER BY ORDINAL_POSITION
        `);
      
      const columns = columnCheck.recordset.map((r: any) => r.COLUMN_NAME);
      console.log('[getAttendance] Available columns:', columns);
      
      // Find period_id column for sorting (employees_attendance uses period_id, not date)
      const periodColumn = columns.find((c: string) => 
        c.toLowerCase().includes('period_id') || 
        c.toLowerCase() === 'period_id'
      ) || columns[0];
      
      const result = await pool
        .request()
        .input('employeeId', sql.NVarChar, employeeId)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT TOP (@limit) *
          FROM employees_attendance
          WHERE employee_id = @employeeId
          ORDER BY ${periodColumn} DESC
        `);

      return result.recordset.map((row: any) => {
        // Return all columns as-is, but also map to expected field names
        const mapped: any = { ...row }; // Keep all original columns
        
        // Map to expected field names for compatibility
        Object.keys(row).forEach(key => {
          const lowerKey = key.toLowerCase();
          // Map id
          if ((lowerKey.includes('id') && !lowerKey.includes('employee')) || lowerKey === 'id') {
            mapped.id = row[key];
          }
          // Map employee_id
          if (lowerKey.includes('employee_id') || lowerKey === 'employee_id') {
            mapped.employee_id = row[key];
          }
          // Map date
          if ((lowerKey.includes('date') && !lowerKey.includes('created') && !lowerKey.includes('updated')) || lowerKey === 'date') {
            mapped.date = row[key];
          }
          // Map check_in
          if (lowerKey.includes('check_in') || lowerKey.includes('checkin') || lowerKey.includes('start_time')) {
            mapped.check_in = row[key];
          }
          // Map check_out
          if (lowerKey.includes('check_out') || lowerKey.includes('checkout') || lowerKey.includes('end_time')) {
            mapped.check_out = row[key];
          }
          // Map hours_worked
          if (lowerKey.includes('hours_worked') || lowerKey.includes('hours') || lowerKey.includes('worked')) {
            mapped.hours_worked = row[key];
          }
          // Map status
          if ((lowerKey.includes('status') && !lowerKey.includes('employment')) || lowerKey === 'status') {
            mapped.status = row[key];
          }
        });
        return mapped;
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return [];
    }
  }

  /**
   * Get contracts for an employee
   */
  private async getContracts(
    pool: sql.ConnectionPool,
    employeeId: string,
  ): Promise<EmployeeContract[]> {
    try {
      // Get column names first to determine sort column
      const columnCheck = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'employees_contracts'
          ORDER BY ORDINAL_POSITION
        `);
      
      const columns = columnCheck.recordset.map((r: any) => r.COLUMN_NAME);
      console.log('[getContracts] Available columns:', columns);
      
      // Find date column for sorting
      const dateColumn = columns.find((c: string) => 
        c.toLowerCase().includes('start_date') || 
        c.toLowerCase().includes('contract_start_date') ||
        c.toLowerCase().includes('date')
      ) || columns[0];
      
      const result = await pool
        .request()
        .input('employeeId', sql.NVarChar, employeeId)
        .query(`
          SELECT *
          FROM employees_contracts
          WHERE employee_id = @employeeId
          ORDER BY ${dateColumn} DESC
        `);

      return result.recordset.map((row: any) => {
        // Return all columns as-is, but also map to expected field names
        const mapped: any = { ...row }; // Keep all original columns
        
        // Map to expected field names for compatibility
        Object.keys(row).forEach(key => {
          const lowerKey = key.toLowerCase();
          // Map id
          if ((lowerKey.includes('id') && !lowerKey.includes('employee')) || lowerKey === 'id') {
            mapped.id = row[key];
          }
          // Map employee_id
          if (lowerKey.includes('employee_id') || lowerKey === 'employee_id') {
            mapped.employee_id = row[key];
          }
          // Map contract_type
          if (lowerKey.includes('contract_type') || lowerKey.includes('type')) {
            mapped.contract_type = row[key];
          }
          // Map start_date
          if (lowerKey.includes('start_date') || (lowerKey.includes('start') && lowerKey.includes('date'))) {
            mapped.start_date = row[key];
          }
          // Map end_date
          if (lowerKey.includes('end_date') || (lowerKey.includes('end') && lowerKey.includes('date'))) {
            mapped.end_date = row[key];
          }
          // Map salary
          if (lowerKey.includes('salary') || lowerKey.includes('wage')) {
            mapped.salary = row[key];
          }
          // Map status
          if ((lowerKey.includes('status') && !lowerKey.includes('employment')) || lowerKey === 'status') {
            mapped.status = row[key];
          }
        });
        return mapped;
      });
    } catch (error) {
      console.error('Error fetching contracts:', error);
      return [];
    }
  }

  /**
   * Get leave balances for an employee
   */
  private async getLeaveBalances(
    pool: sql.ConnectionPool,
    employeeId: string,
  ): Promise<EmployeeLeaveBalance[]> {
    try {
      // Some tenants may not have the employees_leave_balances table yet.
      // First check if the table exists; if not, return an empty array without throwing.
      const tableCheck = await pool
        .request()
        .query(`
          SELECT 1 AS existsFlag
          FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_NAME = 'employees_leave_balances'
        `);

      if (!tableCheck.recordset || tableCheck.recordset.length === 0) {
        // Table does not exist yet - just return empty balances
        console.warn('[getLeaveBalances] Table employees_leave_balances does not exist, returning empty list');
        return [];
      }

      const result = await pool
        .request()
        .input('employeeId', sql.NVarChar, employeeId)
        .query(`
          SELECT 
            id,
            employee_id,
            leave_type,
            balance,
            used,
            available,
            year
          FROM employees_leave_balances
          WHERE employee_id = @employeeId
          ORDER BY year DESC, leave_type
        `);

      return result.recordset.map((row: any) => ({
        id: row.id,
        employee_id: row.employee_id,
        leave_type: row.leave_type,
        balance: row.balance,
        used: row.used,
        available: row.available,
        year: row.year,
      }));
    } catch (error) {
      // If table doesn't exist or any other error occurs, log once and return empty
      console.error('Error fetching leave balances:', error);
      return [];
    }
  }

  /**
   * Terminate/Delete employee - deletes from master and all detail tables
   */
  /**
   * Update employee
   */
  async updateEmployee(
    tenantCode: string,
    employeeId: string,
    updateData: Record<string, any>,
  ): Promise<EmployeeDetail> {
    const pool = await this.getTenantPool(tenantCode);

    try {
      // Build UPDATE query dynamically
      const allowedFields = [
        'first_name', 'last_name', 'email', 'cell_phone_number',
        'tz_id', 'national_id', 'department_number', 'job_title',
        'employment_status', 'hire_date', 'is_active',
      ];

      const updateFields: string[] = [];
      const request = pool.request();
      request.input('employeeId', sql.NVarChar, employeeId);

      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          const paramName = key.replace(/_/g, '');
          updateFields.push(`${key} = @${paramName}`);
          
          // Handle different data types
          const value = updateData[key];
          if (value === null) {
            request.input(paramName, sql.NVarChar, null);
          } else if (typeof value === 'string') {
            request.input(paramName, sql.NVarChar, value);
          } else if (typeof value === 'number') {
            request.input(paramName, sql.Int, value);
          } else if (typeof value === 'boolean') {
            request.input(paramName, sql.Bit, value);
          } else if (value instanceof Date) {
            request.input(paramName, sql.DateTime, value);
          } else {
            request.input(paramName, sql.NVarChar, String(value));
          }
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated_at if it exists in the table
      const query = `
        UPDATE employees
        SET ${updateFields.join(', ')}
        WHERE employee_id = @employeeId
      `;

      await request.query(query);

      // Return updated employee
      return await this.getEmployeeById(tenantCode, employeeId);
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }

  async terminateEmployee(tenantCode: string, employeeId: string): Promise<void> {
    const pool = await this.getTenantPool(tenantCode);

    // Use a transaction to ensure all deletions succeed or none do
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Delete from all detail tables first (to respect foreign key constraints)
      const detailTables = [
        'employee_bank_details',
        'employee_pay_items',
        'employee_pension_profile',
        'employee_tax_profile',
        'employees_attendance',
        'employees_contracts',
        // employees_leave_balances table is optional / may not exist yet, so we skip it here
      ];

      for (const tableName of detailTables) {
        const request = new sql.Request(transaction);
        await request
          .input('employeeId', sql.NVarChar, employeeId)
          .query(`DELETE FROM ${tableName} WHERE employee_id = @employeeId`);
        console.log(`[EmployeesService] Deleted from ${tableName} for employee ${employeeId}`);
      }

      // Finally, delete from master employees table
      const masterRequest = new sql.Request(transaction);
      await masterRequest
        .input('employeeId', sql.NVarChar, employeeId)
        .query(`DELETE FROM employees WHERE employee_id = @employeeId`);
      
      console.log(`[EmployeesService] Deleted employee ${employeeId} from employees table`);

      await transaction.commit();
      console.log(`[EmployeesService] Successfully terminated employee ${employeeId}`);
    } catch (error) {
      await transaction.rollback();
      console.error(`[EmployeesService] Error terminating employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new pension record for an employee
   */
  async createPensionRecord(
    tenantCode: string,
    employeeId: string,
    pensionData: Record<string, any>,
  ): Promise<any> {
    const pool = await this.getTenantPool(tenantCode);

    try {
      // Get all columns from employees_pension table
      const columnsResult = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME, DATA_TYPE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'employees_pension'
          ORDER BY ORDINAL_POSITION
        `);

      const columns = columnsResult.recordset.map((row: any) => row.COLUMN_NAME);
      const dataTypes = columnsResult.recordset.map((row: any) => row.DATA_TYPE);

      // Build INSERT query
      const insertFields: string[] = [];
      const insertValues: string[] = [];
      const request = pool.request();

      // Always include employee_id
      insertFields.push('employee_id');
      insertValues.push('@employeeId');
      request.input('employeeId', sql.NVarChar, employeeId);

      // Add other fields from pensionData
      columns.forEach((column, index) => {
        if (column === 'employee_id' || column === 'emp_pension_id') {
          return; // Skip employee_id (already added) and emp_pension_id (auto-increment)
        }

        if (pensionData.hasOwnProperty(column) && pensionData[column] !== undefined) {
          insertFields.push(column);
          insertValues.push(`@${column.replace(/_/g, '')}`);

          const value = pensionData[column];
          const dataType = dataTypes[index];

          // Map data types
          if (value === null) {
            request.input(column.replace(/_/g, ''), sql.NVarChar, null);
          } else if (dataType === 'bit' || dataType === 'tinyint') {
            request.input(column.replace(/_/g, ''), sql.Bit, Boolean(value));
          } else if (dataType === 'int' || dataType === 'smallint') {
            request.input(column.replace(/_/g, ''), sql.Int, Number(value));
          } else if (dataType === 'decimal' || dataType === 'numeric' || dataType === 'float' || dataType === 'real') {
            request.input(column.replace(/_/g, ''), sql.Decimal(18, 2), Number(value));
          } else if (dataType === 'date' || dataType === 'datetime' || dataType === 'datetime2') {
            request.input(column.replace(/_/g, ''), sql.DateTime, value instanceof Date ? value : new Date(value));
          } else {
            request.input(column.replace(/_/g, ''), sql.NVarChar, String(value));
          }
        }
      });

      if (insertFields.length === 0) {
        throw new Error('No valid fields to insert');
      }

      const query = `
        INSERT INTO employees_pension (${insertFields.join(', ')})
        OUTPUT INSERTED.*
        VALUES (${insertValues.join(', ')})
      `;

      const result = await request.query(query);
      return result.recordset[0];
    } catch (error) {
      console.error('Error creating pension record:', error);
      throw error;
    }
  }

  /**
   * Update a pension record
   */
  async updatePensionRecord(
    tenantCode: string,
    employeeId: string,
    pensionId: string | number,
    pensionData: Record<string, any>,
  ): Promise<any> {
    const pool = await this.getTenantPool(tenantCode);

    try {
      // Get all columns from employees_pension table
      const columnsResult = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME, DATA_TYPE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'employees_pension'
          ORDER BY ORDINAL_POSITION
        `);

      const columns = columnsResult.recordset.map((row: any) => row.COLUMN_NAME);
      const dataTypes = columnsResult.recordset.map((row: any) => row.DATA_TYPE);

      // Build UPDATE query
      const updateFields: string[] = [];
      const request = pool.request();
      request.input('employeeId', sql.NVarChar, employeeId);
      request.input('pensionId', sql.Int, Number(pensionId));

      columns.forEach((column, index) => {
        if (column === 'employee_id' || column === 'emp_pension_id') {
          return; // Skip these fields
        }

        if (pensionData.hasOwnProperty(column) && pensionData[column] !== undefined) {
          updateFields.push(`${column} = @${column.replace(/_/g, '')}`);

          const value = pensionData[column];
          const dataType = dataTypes[index];

          // Map data types
          if (value === null) {
            request.input(column.replace(/_/g, ''), sql.NVarChar, null);
          } else if (dataType === 'bit' || dataType === 'tinyint') {
            request.input(column.replace(/_/g, ''), sql.Bit, Boolean(value));
          } else if (dataType === 'int' || dataType === 'smallint') {
            request.input(column.replace(/_/g, ''), sql.Int, Number(value));
          } else if (dataType === 'decimal' || dataType === 'numeric' || dataType === 'float' || dataType === 'real') {
            request.input(column.replace(/_/g, ''), sql.Decimal(18, 2), Number(value));
          } else if (dataType === 'date' || dataType === 'datetime' || dataType === 'datetime2') {
            request.input(column.replace(/_/g, ''), sql.DateTime, value instanceof Date ? value : new Date(value));
          } else {
            request.input(column.replace(/_/g, ''), sql.NVarChar, String(value));
          }
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const query = `
        UPDATE employees_pension
        SET ${updateFields.join(', ')}
        WHERE employee_id = @employeeId AND emp_pension_id = @pensionId
      `;

      await request.query(query);

      // Return updated record
      const result = await pool
        .request()
        .input('employeeId', sql.NVarChar, employeeId)
        .input('pensionId', sql.Int, Number(pensionId))
        .query(`
          SELECT *
          FROM employees_pension
          WHERE employee_id = @employeeId AND emp_pension_id = @pensionId
        `);

      return result.recordset[0];
    } catch (error) {
      console.error('Error updating pension record:', error);
      throw error;
    }
  }

  /**
   * Delete a pension record
   */
  async deletePensionRecord(
    tenantCode: string,
    employeeId: string,
    pensionId: string | number,
  ): Promise<void> {
    const pool = await this.getTenantPool(tenantCode);

    try {
      await pool
        .request()
        .input('employeeId', sql.NVarChar, employeeId)
        .input('pensionId', sql.Int, Number(pensionId))
        .query(`
          DELETE FROM employees_pension
          WHERE employee_id = @employeeId AND emp_pension_id = @pensionId
        `);

      console.log(`[EmployeesService] Deleted pension record ${pensionId} for employee ${employeeId}`);
    } catch (error) {
      console.error('Error deleting pension record:', error);
      throw error;
    }
  }

  /**
   * Save all employee data in a single transaction
   * This ensures atomicity - either all changes are saved or none
   * PUT /employees/:id/save-all
   */
  async saveAllEmployeeData(
    tenantCode: string,
    employeeId: string,
    saveData: SaveEmployeeDto,
  ): Promise<{ success: boolean; message: string; details?: any }> {
    const pool = await this.getTenantPool(tenantCode);
    const transaction = new sql.Transaction(pool);

    const operationLog: string[] = [];
    const startTime = Date.now();

    try {
      this.logger.log(`[saveAllEmployeeData] Starting transaction for employee ${employeeId}`);
      this.logger.debug(`[saveAllEmployeeData] Save data: ${JSON.stringify(saveData, null, 2)}`);
      
      await transaction.begin();
      operationLog.push(`[${new Date().toISOString()}] Transaction started`);

      // 1. Update master table (employees)
      if (saveData.master && Object.keys(saveData.master).length > 0) {
        await this.updateEmployeeInTransaction(transaction, employeeId, saveData.master, operationLog);
      }

      // 2. Update/Insert tax profile (employees_tax) - single record
      if (saveData.tax && Object.keys(saveData.tax).length > 0) {
        await this.saveTaxProfileInTransaction(transaction, employeeId, saveData.tax, operationLog);
      }

      // 3. Save contracts (employees_contracts) - multiple records
      if (saveData.contracts) {
        await this.saveContractsInTransaction(transaction, employeeId, saveData.contracts, operationLog);
      }

      // 4. Save attendance (employees_attendance) - multiple records
      if (saveData.attendance) {
        await this.saveAttendanceInTransaction(transaction, employeeId, saveData.attendance, operationLog);
      }

      // 5. Save bank details (employees_bank_details) - multiple records
      if (saveData.bank_details) {
        await this.saveBankDetailsInTransaction(transaction, employeeId, saveData.bank_details, operationLog);
      }

      // 6. Save pension (employees_pension) - multiple records
      if (saveData.pension) {
        await this.savePensionInTransaction(transaction, employeeId, saveData.pension, operationLog);
      }

      // 7. Save pay items (employees_pay_items) - multiple records
      if (saveData.pay_items) {
        await this.savePayItemsInTransaction(transaction, employeeId, saveData.pay_items, operationLog);
      }

      await transaction.commit();
      const duration = Date.now() - startTime;
      operationLog.push(`[${new Date().toISOString()}] Transaction committed successfully (${duration}ms)`);
      
      this.logger.log(`[saveAllEmployeeData] Successfully saved all data for employee ${employeeId} in ${duration}ms`);
      this.logger.debug(`[saveAllEmployeeData] Operation log:\n${operationLog.join('\n')}`);

      return {
        success: true,
        message: 'All employee data saved successfully',
        details: {
          duration: `${duration}ms`,
          operations: operationLog.length,
        },
      };
    } catch (error: any) {
      await transaction.rollback();
      const duration = Date.now() - startTime;
      operationLog.push(`[${new Date().toISOString()}] Transaction rolled back due to error (${duration}ms)`);
      
      this.logger.error(`[saveAllEmployeeData] Error saving employee ${employeeId}:`, error);
      this.logger.error(`[saveAllEmployeeData] Operation log:\n${operationLog.join('\n')}`);
      
      throw new BadRequestException({
        message: `Failed to save employee data: ${error.message}`,
        error: error.message,
        operationLog,
        duration: `${duration}ms`,
      });
    }
  }

  /**
   * Helper: Update employee master table in transaction
   */
  private async updateEmployeeInTransaction(
    transaction: sql.Transaction,
    employeeId: string,
    updateData: Record<string, any>,
    operationLog: string[],
  ): Promise<void> {
    const request = new sql.Request(transaction);
    const allowedFields = [
      'first_name', 'last_name', 'email', 'cell_phone_number',
      'tz_id', 'national_id', 'department_number', 'job_title',
      'employment_status', 'hire_date', 'is_active', 'site_number',
      'employment_percent', 'position', 'status',
    ];

    const updateFields: string[] = [];
    request.input('employeeId', sql.NVarChar, employeeId);

    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        const paramName = key.replace(/_/g, '');
        updateFields.push(`${key} = @${paramName}`);
        
        const value = updateData[key];
        if (value === null) {
          request.input(paramName, sql.NVarChar, null);
        } else if (typeof value === 'string') {
          request.input(paramName, sql.NVarChar, value);
        } else if (typeof value === 'number') {
          request.input(paramName, sql.Int, value);
        } else if (typeof value === 'boolean') {
          request.input(paramName, sql.Bit, value);
        } else if (value instanceof Date) {
          request.input(paramName, sql.DateTime, value);
        } else {
          request.input(paramName, sql.NVarChar, String(value));
        }
      }
    });

    if (updateFields.length === 0) {
      operationLog.push(`[updateEmployeeInTransaction] No fields to update, skipping`);
      return;
    }

    const query = `UPDATE employees SET ${updateFields.join(', ')} WHERE employee_id = @employeeId`;
    await request.query(query);
    operationLog.push(`[updateEmployeeInTransaction] Updated ${updateFields.length} fields in employees table`);
  }

  /**
   * Helper: Save tax profile (UPDATE or INSERT) in transaction
   */
  private async saveTaxProfileInTransaction(
    transaction: sql.Transaction,
    employeeId: string,
    taxData: Record<string, any>,
    operationLog: string[],
  ): Promise<void> {
    const request = new sql.Request(transaction);
    request.input('employeeId', sql.NVarChar, employeeId);

    // Check if tax profile exists
    const checkResult = await request.query(`
      SELECT COUNT(*) as count FROM employees_tax WHERE employee_id = @employeeId
    `);

    const exists = checkResult.recordset[0].count > 0;

    if (exists) {
      // UPDATE
      const updateFields: string[] = [];
      const updateRequest = new sql.Request(transaction);
      updateRequest.input('employeeId', sql.NVarChar, employeeId);

      Object.keys(taxData).forEach((key) => {
        if (key !== 'employee_id' && key !== 'client_id' && taxData[key] !== undefined) {
          const paramName = key.replace(/_/g, '');
          updateFields.push(`${key} = @${paramName}`);
          
          const value = taxData[key];
          if (value === null) {
            updateRequest.input(paramName, sql.NVarChar, null);
          } else if (typeof value === 'boolean') {
            updateRequest.input(paramName, sql.Bit, Boolean(value));
          } else if (typeof value === 'number') {
            updateRequest.input(paramName, sql.Int, Number(value));
          } else {
            updateRequest.input(paramName, sql.NVarChar, String(value));
          }
        }
      });

      if (updateFields.length > 0) {
        const updateQuery = `UPDATE employees_tax SET ${updateFields.join(', ')} WHERE employee_id = @employeeId`;
        await updateRequest.query(updateQuery);
        operationLog.push(`[saveTaxProfileInTransaction] Updated tax profile (${updateFields.length} fields)`);
      }
    } else {
      // INSERT
      const insertFields = ['employee_id'];
      const insertValues = ['@employeeId'];
      const insertRequest = new sql.Request(transaction);
      insertRequest.input('employeeId', sql.NVarChar, employeeId);

      Object.keys(taxData).forEach((key) => {
        if (key !== 'employee_id' && key !== 'client_id' && taxData[key] !== undefined) {
          const paramName = key.replace(/_/g, '');
          insertFields.push(key);
          insertValues.push(`@${paramName}`);
          
          const value = taxData[key];
          if (value === null) {
            insertRequest.input(paramName, sql.NVarChar, null);
          } else if (typeof value === 'boolean') {
            insertRequest.input(paramName, sql.Bit, Boolean(value));
          } else if (typeof value === 'number') {
            insertRequest.input(paramName, sql.Int, Number(value));
          } else {
            insertRequest.input(paramName, sql.NVarChar, String(value));
          }
        }
      });

      if (insertFields.length > 1) {
        const insertQuery = `INSERT INTO employees_tax (${insertFields.join(', ')}) VALUES (${insertValues.join(', ')})`;
        await insertRequest.query(insertQuery);
        operationLog.push(`[saveTaxProfileInTransaction] Created new tax profile`);
      }
    }
  }

  /**
   * Generic helper: Save records in a detail table (INSERT/UPDATE/DELETE)
   */
  private async saveDetailTableInTransaction(
    transaction: sql.Transaction,
    employeeId: string,
    tableName: string,
    primaryKeyColumn: string,
    changes: { created?: any[]; updated?: any[]; deleted?: (number | string)[] },
    operationLog: string[],
  ): Promise<void> {
    // Get table structure using a request from the transaction
    const schemaRequest = new sql.Request(transaction);
    const columnsResult = await schemaRequest.query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${tableName}'
      ORDER BY ORDINAL_POSITION
    `);

    const columns = columnsResult.recordset.map((row: any) => row.COLUMN_NAME);
    const dataTypes = columnsResult.recordset.map((row: any) => row.DATA_TYPE);
    const dataTypeMap = new Map<string, string>();
    columns.forEach((col, idx) => dataTypeMap.set(col, dataTypes[idx]));
    
    // Get the data type of the primary key column to determine if it's string or number
    const primaryKeyDataType = dataTypeMap.get(primaryKeyColumn);

    // DELETE first
    if (changes.deleted && changes.deleted.length > 0) {
      for (const id of changes.deleted) {
        const deleteRequest = new sql.Request(transaction);
        deleteRequest.input('employeeId', sql.NVarChar, employeeId);
        // Support both string and number IDs based on column data type
        const isPrimaryKeyNumeric = primaryKeyDataType && (
          primaryKeyDataType === 'int' || 
          primaryKeyDataType === 'bigint' || 
          primaryKeyDataType === 'smallint' ||
          primaryKeyDataType === 'tinyint'
        );
        if (isPrimaryKeyNumeric && (typeof id === 'number' || !isNaN(Number(id)))) {
          deleteRequest.input('recordId', sql.Int, Number(id));
        } else {
          deleteRequest.input('recordId', sql.NVarChar, String(id));
        }
        await deleteRequest.query(
          `DELETE FROM ${tableName} WHERE employee_id = @employeeId AND ${primaryKeyColumn} = @recordId`
        );
      }
      operationLog.push(`[saveDetailTableInTransaction ${tableName}] Deleted ${changes.deleted.length} record(s)`);
    }

    // UPDATE
    if (changes.updated && changes.updated.length > 0) {
      for (const record of changes.updated) {
        const recordId = record[primaryKeyColumn] || record.id || record[`${tableName.split('_').pop()}_id`];
        if (!recordId) {
          throw new Error(`Cannot update ${tableName}: missing primary key`);
        }

        const updateFields: string[] = [];
        const updateRequest = new sql.Request(transaction);
        updateRequest.input('employeeId', sql.NVarChar, employeeId);
        // Support both string and number IDs based on column data type
        const isPrimaryKeyNumeric = primaryKeyDataType && (
          primaryKeyDataType === 'int' || 
          primaryKeyDataType === 'bigint' || 
          primaryKeyDataType === 'smallint' ||
          primaryKeyDataType === 'tinyint'
        );
        if (isPrimaryKeyNumeric && (typeof recordId === 'number' || !isNaN(Number(recordId)))) {
          updateRequest.input('recordId', sql.Int, Number(recordId));
        } else {
          updateRequest.input('recordId', sql.NVarChar, String(recordId));
        }

        columns.forEach((column) => {
          if (column === 'employee_id' || column === primaryKeyColumn || column === 'client_id') {
            return; // Skip these fields
          }

          if (record.hasOwnProperty(column) && record[column] !== undefined) {
            updateFields.push(`${column} = @${column.replace(/_/g, '')}`);
            const value = record[column];
            const dataType = dataTypeMap.get(column);

            // Map data types
            if (value === null) {
              updateRequest.input(column.replace(/_/g, ''), sql.NVarChar, null);
            } else if (dataType === 'bit' || dataType === 'tinyint') {
              updateRequest.input(column.replace(/_/g, ''), sql.Bit, Boolean(value));
            } else if (dataType === 'int' || dataType === 'smallint') {
              updateRequest.input(column.replace(/_/g, ''), sql.Int, Number(value));
            } else if (dataType === 'decimal' || dataType === 'numeric' || dataType === 'float' || dataType === 'real') {
              updateRequest.input(column.replace(/_/g, ''), sql.Decimal(18, 2), Number(value));
            } else if (dataType === 'date' || dataType === 'datetime' || dataType === 'datetime2') {
              updateRequest.input(column.replace(/_/g, ''), sql.DateTime, value instanceof Date ? value : new Date(value));
            } else {
              updateRequest.input(column.replace(/_/g, ''), sql.NVarChar, String(value));
            }
          }
        });

        if (updateFields.length > 0) {
          const updateQuery = `
            UPDATE ${tableName}
            SET ${updateFields.join(', ')}
            WHERE employee_id = @employeeId AND ${primaryKeyColumn} = @recordId
          `;
          this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Executing UPDATE query: ${updateQuery.substring(0, 200)}...`);
          this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Record ID: ${recordId}, Type: ${typeof recordId}, Primary key type: ${primaryKeyDataType}`);
          try {
            await updateRequest.query(updateQuery);
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] UPDATE successful for record ${recordId}`);
          } catch (updateError: any) {
            this.logger.error(`[saveDetailTableInTransaction ${tableName}] UPDATE failed for record ${recordId}:`, updateError);
            this.logger.error(`[saveDetailTableInTransaction ${tableName}] Query: ${updateQuery}`);
            this.logger.error(`[saveDetailTableInTransaction ${tableName}] Record data:`, JSON.stringify(record, null, 2));
            throw updateError;
          }
        } else {
          this.logger.warn(`[saveDetailTableInTransaction ${tableName}] No fields to update for record ${recordId}`);
        }
      }
      operationLog.push(`[saveDetailTableInTransaction ${tableName}] Updated ${changes.updated.length} record(s)`);
    }

    // INSERT
    if (changes.created && changes.created.length > 0) {
      for (const record of changes.created) {
        const insertFields: string[] = ['employee_id'];
        const insertValues: string[] = ['@employeeId'];
        const insertRequest = new sql.Request(transaction);
        insertRequest.input('employeeId', sql.NVarChar, employeeId);

        columns.forEach((column) => {
          if (column === 'employee_id' || column === primaryKeyColumn || column === 'client_id') {
            return; // Skip employee_id (already added) and primary key (auto-increment)
          }

          if (record.hasOwnProperty(column) && record[column] !== undefined) {
            insertFields.push(column);
            insertValues.push(`@${column.replace(/_/g, '')}`);
            const value = record[column];
            const dataType = dataTypeMap.get(column);

            // Map data types
            if (value === null) {
              insertRequest.input(column.replace(/_/g, ''), sql.NVarChar, null);
            } else if (dataType === 'bit' || dataType === 'tinyint') {
              insertRequest.input(column.replace(/_/g, ''), sql.Bit, Boolean(value));
            } else if (dataType === 'int' || dataType === 'smallint') {
              insertRequest.input(column.replace(/_/g, ''), sql.Int, Number(value));
            } else if (dataType === 'decimal' || dataType === 'numeric' || dataType === 'float' || dataType === 'real') {
              insertRequest.input(column.replace(/_/g, ''), sql.Decimal(18, 2), Number(value));
            } else if (dataType === 'date' || dataType === 'datetime' || dataType === 'datetime2') {
              insertRequest.input(column.replace(/_/g, ''), sql.DateTime, value instanceof Date ? value : new Date(value));
            } else {
              insertRequest.input(column.replace(/_/g, ''), sql.NVarChar, String(value));
            }
          }
        });

        if (insertFields.length > 1) {
          const insertQuery = `
            INSERT INTO ${tableName} (${insertFields.join(', ')})
            VALUES (${insertValues.join(', ')})
          `;
          await insertRequest.query(insertQuery);
        }
      }
      operationLog.push(`[saveDetailTableInTransaction ${tableName}] Created ${changes.created.length} record(s)`);
    }
  }

  /**
   * Helper: Save contracts in transaction (INSERT/UPDATE/DELETE)
   */
  private async saveContractsInTransaction(
    transaction: sql.Transaction,
    employeeId: string,
    changes: { created?: any[]; updated?: any[]; deleted?: (number | string)[] },
    operationLog: string[],
  ): Promise<void> {
    await this.saveDetailTableInTransaction(
      transaction,
      employeeId,
      'employees_contracts',
      'contract_id',
      changes,
      operationLog,
    );
  }

  /**
   * Helper: Save attendance in transaction (INSERT/UPDATE/DELETE)
   */
  private async saveAttendanceInTransaction(
    transaction: sql.Transaction,
    employeeId: string,
    changes: { created?: any[]; updated?: any[]; deleted?: (number | string)[] },
    operationLog: string[],
  ): Promise<void> {
    await this.saveDetailTableInTransaction(
      transaction,
      employeeId,
      'employees_attendance',
      'attendance_id',
      changes,
      operationLog,
    );
  }

  /**
   * Helper: Save bank details in transaction (INSERT/UPDATE/DELETE)
   */
  private async saveBankDetailsInTransaction(
    transaction: sql.Transaction,
    employeeId: string,
    changes: { created?: any[]; updated?: any[]; deleted?: (number | string)[] },
    operationLog: string[],
  ): Promise<void> {
    await this.saveDetailTableInTransaction(
      transaction,
      employeeId,
      'employees_bank_details',
      'bank_detail_id',
      changes,
      operationLog,
    );
  }

  /**
   * Helper: Save pension in transaction (INSERT/UPDATE/DELETE)
   */
  private async savePensionInTransaction(
    transaction: sql.Transaction,
    employeeId: string,
    changes: { created?: any[]; updated?: any[]; deleted?: (number | string)[] },
    operationLog: string[],
  ): Promise<void> {
    await this.saveDetailTableInTransaction(
      transaction,
      employeeId,
      'employees_pension',
      'emp_pension_id',
      changes,
      operationLog,
    );
  }

  /**
   * Helper: Save pay items in transaction (INSERT/UPDATE/DELETE)
   */
  private async savePayItemsInTransaction(
    transaction: sql.Transaction,
    employeeId: string,
    changes: { created?: any[]; updated?: any[]; deleted?: (number | string)[] },
    operationLog: string[],
  ): Promise<void> {
    await this.saveDetailTableInTransaction(
      transaction,
      employeeId,
      'employees_pay_items',
      'pay_item_id',
      changes,
      operationLog,
    );
  }
}

