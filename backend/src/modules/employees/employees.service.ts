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
    this.logger.log(`[getEmployees] Called for tenantCode: ${tenantCode}`);
    console.log('[EmployeesService] getEmployees called for tenant:', tenantCode);
    
    if (!tenantCode) {
      this.logger.error('[getEmployees] tenantCode is null or undefined!');
      throw new Error('tenantCode is required');
    }
    
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

      // Get total count - filter by client_id (tenant code)
      // Use LTRIM/RTRIM to handle any whitespace issues and ensure exact match
      this.logger.log(`[getEmployees] Executing count query with client_id = '${tenantCode}'`);
      const countResult = await pool
        .request()
        .input('client_id', sql.NVarChar, tenantCode.trim())
        .query(`
          SELECT COUNT(*) as total
          FROM employees
          WHERE LTRIM(RTRIM(client_id)) = LTRIM(RTRIM(@client_id)) AND is_active = 1
        `);
      
      this.logger.log(`[getEmployees] Count query result: ${countResult.recordset[0]?.total || 0} employees for client_id = '${tenantCode}'`);
      
      // Debug: Let's also check what client_ids actually exist in the table
      const debugResult = await pool
        .request()
        .query(`
          SELECT DISTINCT LTRIM(RTRIM(client_id)) as client_id, COUNT(*) as count
          FROM employees
          WHERE is_active = 1
          GROUP BY LTRIM(RTRIM(client_id))
        `);
      this.logger.log(`[getEmployees] Debug: All client_ids in employees table:`, JSON.stringify(debugResult.recordset));
      
      const total = countResult.recordset[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;

      // Now query with pagination - filter by client_id (tenant code)
      this.logger.log(`[getEmployees] Executing query with pagination for client_id=${tenantCode}: page=${page}, limit=${limit}, offset=${offset}, total=${total}, totalPages=${totalPages}`);
      
      // Ensure offset is not negative
      const safeOffset = Math.max(0, offset);
      
      const result = await pool
        .request()
        .input('client_id', sql.NVarChar, tenantCode.trim())
        .input('offset', sql.Int, safeOffset)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT *
          FROM employees
          WHERE LTRIM(RTRIM(client_id)) = LTRIM(RTRIM(@client_id)) AND is_active = 1
          ORDER BY first_name, last_name, employee_id
          OFFSET @offset ROWS
          FETCH NEXT @limit ROWS ONLY
        `);

      this.logger.log(`[getEmployees] Query returned ${result.recordset.length} employees`);
      if (result.recordset.length > 0) {
        this.logger.log(`[getEmployees] First employee: ${result.recordset[0].employee_id}, client_id: ${result.recordset[0].client_id}`);
        this.logger.log(`[getEmployees] Last employee: ${result.recordset[result.recordset.length - 1].employee_id}, client_id: ${result.recordset[result.recordset.length - 1].client_id}`);
        
        // Check if any employees have wrong client_id (trimmed comparison)
        const expectedClientId = tenantCode.trim();
        const wrongClientIds = result.recordset.filter((emp: any) => (emp.client_id || '').trim() !== expectedClientId);
        if (wrongClientIds.length > 0) {
          this.logger.error(`[getEmployees] WARNING: Found ${wrongClientIds.length} employees with wrong client_id!`);
          wrongClientIds.forEach((emp: any) => {
            this.logger.error(`[getEmployees] Employee ${emp.employee_id} has client_id='${(emp.client_id || '').trim()}' but expected '${expectedClientId}'`);
          });
        }
      }

      const employees = result.recordset.map((row: any) => {
        // Log client_id for debugging - use trimmed comparison
        const rowClientId = (row.client_id || '').trim();
        const expectedClientId = tenantCode.trim();
        if (rowClientId !== expectedClientId) {
          this.logger.error(`[getEmployees] WARNING: Employee ${row.employee_id} has client_id='${rowClientId}' but expected '${expectedClientId}'`);
        }
        
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
      
      // Check if xlg_pay_items table exists for JOIN
      const payItemsTableCheck = await pool
        .request()
        .query(`
          SELECT COUNT(*) as table_exists
          FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_NAME = 'xlg_pay_items'
        `);
      
      const hasPayItemsTable = payItemsTableCheck.recordset[0].table_exists > 0;
      
      let result;
      if (hasPayItemsTable) {
        // JOIN with xlg_pay_items to get item_name
        result = await pool
          .request()
          .input('employeeId', sql.NVarChar, employeeId)
          .query(`
            SELECT 
              epi.*,
              xpi.item_name as pay_item_name_from_lookup
            FROM employees_pay_items epi
            LEFT JOIN xlg_pay_items xpi ON epi.item_code = xpi.item_code
            WHERE epi.employee_id = @employeeId
            ORDER BY ${orderBy}
          `);
      } else {
        // Fallback: no JOIN if xlg_pay_items doesn't exist
        result = await pool
          .request()
          .input('employeeId', sql.NVarChar, employeeId)
          .query(`
            SELECT *
            FROM employees_pay_items
            WHERE employee_id = @employeeId
            ORDER BY ${orderBy}
          `);
      }

      // Log available columns for debugging
      if (result.recordset.length > 0) {
        console.log('[getPayItems] Available columns:', Object.keys(result.recordset[0]));
      }

      return result.recordset.map((row: any) => {
        const mapped: any = { ...row }; // Keep all original columns
        
        // Keep pay_item_name from employees_pay_items table (user's custom description)
        // Do NOT override it with item_name from xlg_pay_items
        // item_name from xlg_pay_items is only for reference in item_code column display
        
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
      'employment_percent', 'position', 'status', 'city_code', 'zip_code',
      'address_line1', 'address_line2', 'date_of_birth', 'gender', 'manager_id',
    ];

    // Map frontend field names to database field names
    const fieldMapping: Record<string, string> = {
      'status': 'employment_status', // Frontend uses 'status', database uses 'employment_status'
    };

    const updateFields: string[] = [];
    request.input('employeeId', sql.NVarChar, employeeId);
    
    // Always add updated_at if the column exists in the table
    // Check if updated_at column exists (use a separate request to avoid transaction conflicts)
    try {
      const checkRequest = new sql.Request(transaction);
      const columnCheck = await checkRequest.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'employees' AND COLUMN_NAME = 'updated_at'
      `);
      
      if (columnCheck.recordset.length > 0) {
        updateFields.push('updated_at = GETDATE()');
        operationLog.push(`[updateEmployeeInTransaction] Added updated_at = GETDATE()`);
      }
    } catch (checkError) {
      // If check fails, just skip adding updated_at
      operationLog.push(`[updateEmployeeInTransaction] Could not check for updated_at column, skipping`);
    }

    Object.keys(updateData).forEach((key) => {
      // Map frontend field name to database field name if needed
      const dbFieldName = fieldMapping[key] || key;
      
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        const paramName = dbFieldName.replace(/_/g, '');
        updateFields.push(`${dbFieldName} = @${paramName}`);
        
        const value = updateData[key];
        if (value === null) {
          request.input(paramName, sql.NVarChar, null);
        } else if (typeof value === 'string') {
          request.input(paramName, sql.NVarChar, value);
        } else if (typeof value === 'number') {
          // Check if this is a decimal field (employment_percent)
          if (key === 'employment_percent') {
            request.input(paramName, sql.Decimal(18, 2), value);
          } else {
            request.input(paramName, sql.Int, value);
          }
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
            // additional_credit_points is DECIMAL(5,2)
            if (key === 'additional_credit_points') {
              updateRequest.input(paramName, sql.Decimal(5, 2), Number(value));
            } else {
              updateRequest.input(paramName, sql.Int, Number(value));
            }
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
            // additional_credit_points is DECIMAL(5,2)
            if (key === 'additional_credit_points') {
              insertRequest.input(paramName, sql.Decimal(5, 2), Number(value));
            } else {
              insertRequest.input(paramName, sql.Int, Number(value));
            }
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
    this.logger.debug(`[saveDetailTableInTransaction ${tableName}] START - primaryKeyColumn: ${primaryKeyColumn}, has created: ${!!changes.created}, has updated: ${!!changes.updated}, has deleted: ${!!changes.deleted}`);
    
    // Get table structure using a request from the transaction
    const schemaRequest = new sql.Request(transaction);
    const columnsResult = await schemaRequest.query(`
      SELECT 
        c.COLUMN_NAME, 
        c.DATA_TYPE,
        CASE WHEN ic.object_id IS NOT NULL THEN 1 ELSE 0 END AS IS_IDENTITY
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN sys.identity_columns ic ON ic.object_id = OBJECT_ID('${tableName}') AND ic.name = c.COLUMN_NAME
      WHERE c.TABLE_NAME = '${tableName}'
      ORDER BY c.ORDINAL_POSITION
    `);

    const columns = columnsResult.recordset.map((row: any) => row.COLUMN_NAME);
    const dataTypes = columnsResult.recordset.map((row: any) => row.DATA_TYPE);
    const isIdentityMap = new Map<string, boolean>();
    columnsResult.recordset.forEach((row: any) => {
      isIdentityMap.set(row.COLUMN_NAME, row.IS_IDENTITY === 1);
    });
    const dataTypeMap = new Map<string, string>();
    columns.forEach((col, idx) => dataTypeMap.set(col, dataTypes[idx]));
    
    // Check if primary key column exists in the table (case-insensitive)
    const primaryKeyExists = columns.some(col => col.toLowerCase() === primaryKeyColumn.toLowerCase());
    
    // Check if primary key is IDENTITY (only if it exists)
    const isPrimaryKeyIdentity = primaryKeyExists ? (isIdentityMap.get(primaryKeyColumn) || false) : false;
    
    this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Table columns: ${JSON.stringify(columns)}`);
    this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Primary key column: ${primaryKeyColumn}, exists in table: ${primaryKeyExists}, has 'id' column: ${columns.includes('id')}`);
    this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Primary key '${primaryKeyColumn}' is IDENTITY: ${isPrimaryKeyIdentity}`);
    
    // Get the data type of the primary key column to determine if it's string or number
    const primaryKeyDataType = primaryKeyExists ? dataTypeMap.get(primaryKeyColumn) : null;
    
    // If primary key doesn't exist, we need to handle this table differently
    // For employees_bank_details, we might need to use a composite key (employee_id + bank_code)
    if (!primaryKeyExists) {
      this.logger.warn(`[saveDetailTableInTransaction ${tableName}] Primary key column '${primaryKeyColumn}' does not exist in table. This table may use a composite key or different key structure.`);
    }

    // DELETE first
    if (changes.deleted && changes.deleted.length > 0) {
      for (const id of changes.deleted) {
        const deleteRequest = new sql.Request(transaction);
        deleteRequest.input('employeeId', sql.NVarChar, employeeId);
        
        if (!primaryKeyExists) {
          // For tables without a primary key column (like employees_bank_details),
          // we need to find the record by matching bank_code from the original data
          // Since we only have the id, we need to find the record in the original set
          // For now, use a simpler approach: delete by employee_id only if no PK exists
          // This is not ideal but works for bank_details which typically has one row per employee
          // For tables without PK, try to use bank_code if available in the original data
          // For now, delete all rows for this employee (should be improved to track bank_code)
          await deleteRequest.query(
            `DELETE FROM ${tableName} WHERE employee_id = @employeeId`
          );
        } else {
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
      }
      operationLog.push(`[saveDetailTableInTransaction ${tableName}] Deleted ${changes.deleted.length} record(s)`);
    }

    // UPDATE
    if (changes.updated && changes.updated.length > 0) {
      // For employees_bank_details, convert UPDATE to INSERT to use MERGE (UPSERT)
      if (tableName === 'employees_bank_details' && !primaryKeyExists) {
        // Move all updates to created array - they'll be handled by MERGE in INSERT section
        if (!changes.created) changes.created = [];
        changes.created.push(...changes.updated);
        changes.updated = []; // Clear updates since they're now in created
        this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Converted ${changes.created.length} UPDATE(s) to MERGE via INSERT section`);
      }
      
      for (const record of changes.updated) {
        // Map 'id' to primary key column if they differ
        const recordToUse = { ...record };
        if (recordToUse.hasOwnProperty('id') && primaryKeyColumn !== 'id' && primaryKeyExists) {
          // If 'id' exists but primary key has different name, map it
          if (!recordToUse[primaryKeyColumn]) {
            recordToUse[primaryKeyColumn] = recordToUse.id;
          }
          delete recordToUse.id;
        } else if (recordToUse.hasOwnProperty('id') && !primaryKeyExists) {
          // For tables without PK, just remove the id field
          delete recordToUse.id;
        }
        
        // For tables without a primary key column, use bank_code to identify the row
        let whereClause = '';
        let recordId: string | number | null = null; // Declare at wider scope for logging
        if (!primaryKeyExists && tableName === 'employees_bank_details') {
          // Use employee_id + bank_code as composite key
          if (!recordToUse.bank_code) {
            throw new Error(`Cannot update ${tableName}: missing bank_code for composite key`);
          }
          whereClause = `employee_id = @employeeId AND bank_code = @bankCode`;
          recordId = recordToUse.bank_code; // Use bank_code as identifier for logging
        } else if (!primaryKeyExists && tableName === 'employees_attendance') {
          // Use client_id + employee_id + period_id as composite key
          if (!recordToUse.period_id) {
            throw new Error(`Cannot update ${tableName}: missing period_id for composite key`);
          }
          // Get client_id from employee if not in record
          let clientId = recordToUse.client_id;
          if (!clientId) {
            const clientIdRequest = new sql.Request(transaction);
            clientIdRequest.input('employeeId', sql.NVarChar, employeeId);
            const clientIdResult = await clientIdRequest.query(`
              SELECT client_id FROM employees WHERE employee_id = @employeeId
            `);
            if (clientIdResult.recordset.length > 0) {
              clientId = clientIdResult.recordset[0].client_id;
            }
          }
          if (!clientId) {
            throw new Error(`Cannot update ${tableName}: missing client_id for composite key`);
          }
          whereClause = `client_id = @clientId AND employee_id = @employeeId AND period_id = @periodId`;
          recordId = recordToUse.period_id; // Use period_id as identifier for logging
        } else {
          recordId = recordToUse[primaryKeyColumn] || recordToUse[`${tableName.split('_').pop()}_id`];
          if (!recordId) {
            throw new Error(`Cannot update ${tableName}: missing primary key`);
          }
          whereClause = `employee_id = @employeeId AND ${primaryKeyColumn} = @recordId`;
        }

        const updateFields: string[] = [];
        const updateRequest = new sql.Request(transaction);
        updateRequest.input('employeeId', sql.NVarChar, employeeId);
        
        // Set up WHERE clause parameters based on whether PK exists
        if (!primaryKeyExists && tableName === 'employees_bank_details') {
          // Use bank_code for composite key
          updateRequest.input('bankCode', sql.NVarChar, recordToUse.bank_code);
        } else if (!primaryKeyExists && tableName === 'employees_attendance') {
          // Use client_id, employee_id, period_id for composite key
          let clientId = recordToUse.client_id;
          if (!clientId) {
            const clientIdRequest = new sql.Request(transaction);
            clientIdRequest.input('employeeId', sql.NVarChar, employeeId);
            const clientIdResult = await clientIdRequest.query(`
              SELECT client_id FROM employees WHERE employee_id = @employeeId
            `);
            if (clientIdResult.recordset.length > 0) {
              clientId = clientIdResult.recordset[0].client_id;
            }
          }
          if (!clientId) {
            throw new Error(`Cannot update ${tableName}: missing client_id for composite key`);
          }
          updateRequest.input('clientId', sql.NVarChar, clientId);
          updateRequest.input('periodId', sql.NVarChar, recordToUse.period_id);
        } else {
          // Support both string and number IDs based on column data type
          const isPrimaryKeyNumeric = primaryKeyDataType && (
            primaryKeyDataType === 'int' || 
            primaryKeyDataType === 'bigint' || 
            primaryKeyDataType === 'smallint' ||
            primaryKeyDataType === 'tinyint'
          );
          // recordId already set above
          if (isPrimaryKeyNumeric && (typeof recordId === 'number' || !isNaN(Number(recordId)))) {
            updateRequest.input('recordId', sql.Int, Number(recordId));
          } else {
            updateRequest.input('recordId', sql.NVarChar, String(recordId));
          }
        }

        // Map 'id' to primary key column if they differ, then filter it out
        const recordToUseForUpdate = { ...record };
        if (recordToUseForUpdate.hasOwnProperty('id') && primaryKeyColumn !== 'id') {
          // If 'id' exists but primary key has different name, map it
          if (!recordToUseForUpdate[primaryKeyColumn] && primaryKeyExists) {
            recordToUseForUpdate[primaryKeyColumn] = recordToUseForUpdate.id;
          }
          delete recordToUseForUpdate.id;
        }
        // Also remove primary key column from update record (it should not be updated)
        if (primaryKeyExists && recordToUseForUpdate.hasOwnProperty(primaryKeyColumn)) {
          delete recordToUseForUpdate[primaryKeyColumn];
        }
        
        columns.forEach((column) => {
          const columnLower = column.toLowerCase();
          if (columnLower === 'employee_id' || columnLower === 'client_id') {
            return; // Skip these fields
          }
          
          // Skip primary key column if it exists (case-insensitive comparison)
          if (primaryKeyExists && columnLower === primaryKeyColumn.toLowerCase()) {
            return;
          }
          
          // Skip 'id' column if it exists in table but primary key has different name
          if (columnLower === 'id' && primaryKeyColumn.toLowerCase() !== 'id' && primaryKeyExists) {
            return;
          }
          
          // Skip 'id' column if primary key doesn't exist (table has no PK column)
          if (columnLower === 'id' && !primaryKeyExists) {
            return;
          }
          
          // For bank_details without PK, skip bank_code from UPDATE SET (it's used in WHERE)
          if (!primaryKeyExists && tableName === 'employees_bank_details' && columnLower === 'bank_code') {
            return;
          }
          
          // For attendance without PK, skip period_id and client_id from UPDATE SET (they're used in WHERE)
          if (!primaryKeyExists && tableName === 'employees_attendance' && (columnLower === 'period_id' || columnLower === 'client_id')) {
            return;
          }

          if (recordToUseForUpdate.hasOwnProperty(column) && recordToUseForUpdate[column] !== undefined) {
            updateFields.push(`${column} = @${column.replace(/_/g, '')}`);
            const value = recordToUseForUpdate[column];
            const dataType = dataTypeMap.get(column);

            // Map data types
            if (value === null) {
              updateRequest.input(column.replace(/_/g, ''), sql.NVarChar, null);
            } else if (dataType === 'bit' || dataType === 'tinyint') {
              updateRequest.input(column.replace(/_/g, ''), sql.Bit, Boolean(value));
            } else if (dataType === 'int' || dataType === 'smallint') {
              // item_code should always be saved as string to preserve leading zeros
              if (tableName === 'employees_pay_items' && column.toLowerCase() === 'item_code') {
                updateRequest.input(column.replace(/_/g, ''), sql.NVarChar, String(value));
              } else {
                updateRequest.input(column.replace(/_/g, ''), sql.Int, Number(value));
              }
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
            WHERE ${whereClause}
          `;
          this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Executing UPDATE query: ${updateQuery.substring(0, 200)}...`);
          if (primaryKeyExists) {
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Record ID: ${recordId}, Type: ${typeof recordId}, Primary key type: ${primaryKeyDataType}`);
          } else {
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] No primary key - using composite key (employee_id + bank_code), Record identifier: ${recordId}`);
          }
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
      // Get client_id from employee if table requires it
      let clientId: string | null = null;
      const hasClientIdColumn = columns.includes('client_id');
      if (hasClientIdColumn) {
        try {
          const clientIdRequest = new sql.Request(transaction);
          clientIdRequest.input('employeeId', sql.NVarChar, employeeId);
          const clientIdResult = await clientIdRequest.query(`
            SELECT client_id FROM employees WHERE employee_id = @employeeId
          `);
          if (clientIdResult.recordset.length > 0) {
            clientId = clientIdResult.recordset[0].client_id;
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Got client_id: ${clientId}`);
          }
        } catch (clientIdError: any) {
          this.logger.error(`[saveDetailTableInTransaction ${tableName}] Error getting client_id:`, clientIdError);
          throw clientIdError;
        }
      }
      
      for (const record of changes.created) {
        this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Processing record: ${JSON.stringify(record)}`);
        
        // Filter out 'id' from record FIRST if it doesn't match primary key column
        // Frontend sends 'id: null' but table uses 'pay_item_id' or other name
        const recordToUse = { ...record };
        if (recordToUse.hasOwnProperty('id') && (!primaryKeyExists || primaryKeyColumn !== 'id')) {
          delete recordToUse.id;
          this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Removed 'id' field from record (primary key exists: ${primaryKeyExists}, column: '${primaryKeyColumn}')`);
        }
        this.logger.debug(`[saveDetailTableInTransaction ${tableName}] RecordToUse keys: ${JSON.stringify(Object.keys(recordToUse))}`);
        
        const insertFields: string[] = ['employee_id'];
        const insertValues: string[] = ['@employeeId'];
        const insertRequest = new sql.Request(transaction);
        insertRequest.input('employeeId', sql.NVarChar, employeeId);
        
        // If primary key exists and is not IDENTITY, we need to generate it manually
        if (primaryKeyExists && !isPrimaryKeyIdentity && primaryKeyColumn) {
          // Get the next value for the primary key
          const maxIdRequest = new sql.Request(transaction);
          maxIdRequest.input('employeeId', sql.NVarChar, employeeId);
          const maxIdResult = await maxIdRequest.query(`
            SELECT ISNULL(MAX(${primaryKeyColumn}), 0) + 1 AS nextId
            FROM ${tableName}
            WHERE employee_id = @employeeId
          `);
          const nextId = maxIdResult.recordset[0]?.nextId || 1;
          insertFields.push(primaryKeyColumn);
          insertValues.push(`@${primaryKeyColumn.replace(/_/g, '')}`);
          if (primaryKeyDataType === 'int' || primaryKeyDataType === 'bigint' || primaryKeyDataType === 'smallint') {
            insertRequest.input(primaryKeyColumn.replace(/_/g, ''), sql.Int, nextId);
          } else {
            insertRequest.input(primaryKeyColumn.replace(/_/g, ''), sql.NVarChar, String(nextId));
          }
          this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Generated primary key value: ${nextId} for ${primaryKeyColumn}`);
        }
        
        // Add client_id if table has this column and we have the value
        if (hasClientIdColumn && clientId) {
          insertFields.push('client_id');
          insertValues.push('@clientId');
          insertRequest.input('clientId', sql.NVarChar, clientId);
        }
        
        columns.forEach((column) => {
          const columnLower = column.toLowerCase();
          if (columnLower === 'employee_id' || columnLower === 'client_id') {
            return; // Skip employee_id (already added) and client_id (added separately)
          }
          
          // Skip primary key column if it exists (case-insensitive comparison)
          if (primaryKeyExists && columnLower === primaryKeyColumn.toLowerCase()) {
            return; // Skip primary key (handled above if not IDENTITY)
          }
          
          // Skip 'id' column if it exists in table but primary key has different name
          if (columnLower === 'id' && primaryKeyExists && primaryKeyColumn.toLowerCase() !== 'id') {
            return;
          }
          
          // Skip 'id' column if primary key doesn't exist (table has no PK column)
          if (columnLower === 'id' && !primaryKeyExists) {
            return;
          }

          // Check if column is in record (even if null/undefined) or if it's a required field
          // Use recordToUse which has 'id' removed if it doesn't match primary key
          const hasValue = recordToUse.hasOwnProperty(column);
          const value = hasValue ? recordToUse[column] : undefined;
          
          const dataType = dataTypeMap.get(column);
          
          // For required fields in employees_pay_items (pct, quantity, rate), always include them
          // Check if this is a decimal or int field that might be required
          const isDecimalField = dataType === 'decimal' || dataType === 'numeric' || dataType === 'float' || dataType === 'real';
          const isIntField = dataType === 'int' || dataType === 'smallint';
          const isRequiredPayItemField = tableName === 'employees_pay_items' && 
            (column === 'pct' || column === 'quantity' || column === 'rate');
          
          // Skip if column doesn't exist in record and it's not a required field
          // This prevents trying to use 'id' from frontend when table doesn't have 'id' column
          // Also skip if column is 'id' and it's not the primary key (should have been caught above, but double-check)
          if (columnLower === 'id' && (!primaryKeyExists || primaryKeyColumn.toLowerCase() !== 'id')) {
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Skipping 'id' column (primary key exists: ${primaryKeyExists}, column: '${primaryKeyColumn}')`);
            return;
          }
          
          if (!hasValue && !isRequiredPayItemField) {
            return;
          }
          
          if (hasValue || isRequiredPayItemField) {
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Adding column '${column}' to INSERT (hasValue: ${hasValue}, isRequiredPayItemField: ${isRequiredPayItemField})`);
            insertFields.push(column);
            insertValues.push(`@${column.replace(/_/g, '')}`);

            // Map data types
            if (value === null || value === undefined) {
              if (isRequiredPayItemField) {
                // For required fields in pay_items, use 0 as default
                if (isDecimalField) {
                  insertRequest.input(column.replace(/_/g, ''), sql.Decimal(18, 2), 0);
                } else if (isIntField) {
                  insertRequest.input(column.replace(/_/g, ''), sql.Int, 0);
                } else {
                  insertRequest.input(column.replace(/_/g, ''), sql.NVarChar, null);
                }
              } else {
                insertRequest.input(column.replace(/_/g, ''), sql.NVarChar, null);
              }
            } else if (dataType === 'bit' || dataType === 'tinyint') {
              insertRequest.input(column.replace(/_/g, ''), sql.Bit, Boolean(value));
            } else if (isIntField) {
              // item_code should always be saved as string to preserve leading zeros
              if (tableName === 'employees_pay_items' && column.toLowerCase() === 'item_code') {
                insertRequest.input(column.replace(/_/g, ''), sql.NVarChar, String(value));
              } else {
                insertRequest.input(column.replace(/_/g, ''), sql.Int, Number(value));
              }
            } else if (isDecimalField) {
              // For decimal fields, handle null values - if column doesn't allow nulls, use 0
              const decimalValue = value === null || value === undefined ? 0 : Number(value);
              insertRequest.input(column.replace(/_/g, ''), sql.Decimal(18, 2), decimalValue);
            } else if (dataType === 'date' || dataType === 'datetime' || dataType === 'datetime2') {
              insertRequest.input(column.replace(/_/g, ''), sql.DateTime, value instanceof Date ? value : new Date(value));
            } else {
              insertRequest.input(column.replace(/_/g, ''), sql.NVarChar, String(value));
            }
          }
        });

        if (insertFields.length > 1) {
          // For employees_attendance, DELETE existing then INSERT (simple UPSERT)
          if (tableName === 'employees_attendance' && recordToUse.period_id) {
            if (!hasClientIdColumn || !clientId) {
              throw new Error(`Cannot save ${tableName}: client_id is required`);
            }
            
            const periodIdValue = String(recordToUse.period_id).trim();
            if (!periodIdValue) {
              throw new Error(`Cannot save ${tableName}: period_id is required`);
            }
            
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Before DELETE - client_id: "${clientId}", employee_id: "${employeeId}", period_id: "${periodIdValue}"`);
            
            // DELETE existing record by PRIMARY KEY (client_id, employee_id, period_id)
            const deleteRequest = new sql.Request(transaction);
            deleteRequest.input('clientId', sql.NVarChar, String(clientId).trim());
            deleteRequest.input('employeeId', sql.NVarChar, String(employeeId).trim());
            deleteRequest.input('periodId', sql.NVarChar, periodIdValue);
            const deleteResult = await deleteRequest.query(`
              DELETE FROM ${tableName} 
              WHERE LTRIM(RTRIM(client_id)) = LTRIM(RTRIM(@clientId)) 
                AND LTRIM(RTRIM(employee_id)) = LTRIM(RTRIM(@employeeId)) 
                AND LTRIM(RTRIM(period_id)) = LTRIM(RTRIM(@periodId))
            `);
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Deleted ${deleteResult.rowsAffected[0]} existing record(s) - PK: (${clientId}, ${employeeId}, ${periodIdValue})`);
            
            // Now INSERT - ensure period_id is in insertFields
            if (!insertFields.includes('period_id')) {
              insertFields.push('period_id');
              insertValues.push('@periodid');
              insertRequest.input('periodid', sql.NVarChar, periodIdValue);
            }
            
            const insertQuery = `
              INSERT INTO ${tableName} (${insertFields.join(', ')})
              VALUES (${insertValues.join(', ')})
            `;
            await insertRequest.query(insertQuery);
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] DELETED and INSERTED record`);
          } else if (tableName === 'employees_bank_details' && recordToUse.bank_code) {
            if (!hasClientIdColumn || !clientId) {
              throw new Error(`Cannot save ${tableName}: client_id is required`);
            }
            
            const bankCodeValue = String(recordToUse.bank_code).trim();
            if (!bankCodeValue) {
              throw new Error(`Cannot save ${tableName}: bank_code is required`);
            }
            
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Before DELETE - client_id: "${clientId}", employee_id: "${employeeId}", bank_code: "${bankCodeValue}"`);
            
            // DELETE existing record by PRIMARY KEY (client_id, employee_id, bank_code)
            const deleteRequest = new sql.Request(transaction);
            deleteRequest.input('clientId', sql.NVarChar, String(clientId).trim());
            deleteRequest.input('employeeId', sql.NVarChar, String(employeeId).trim());
            deleteRequest.input('bankCode', sql.NVarChar, bankCodeValue);
            const deleteResult = await deleteRequest.query(`
              DELETE FROM ${tableName} 
              WHERE LTRIM(RTRIM(client_id)) = LTRIM(RTRIM(@clientId)) 
                AND LTRIM(RTRIM(employee_id)) = LTRIM(RTRIM(@employeeId)) 
                AND LTRIM(RTRIM(bank_code)) = LTRIM(RTRIM(@bankCode))
            `);
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Deleted ${deleteResult.rowsAffected[0]} existing record(s) - PK: (${clientId}, ${employeeId}, ${bankCodeValue})`);
            
            // Now INSERT - ensure bank_code is in insertFields
            if (!insertFields.includes('bank_code')) {
              insertFields.push('bank_code');
              insertValues.push('@bankcode');
            }
            
            const insertQuery = `
              INSERT INTO ${tableName} (${insertFields.join(', ')})
              VALUES (${insertValues.join(', ')})
            `;
            await insertRequest.query(insertQuery);
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] DELETED and INSERTED record`);
          } else {
            // Regular INSERT for tables with single-column PK or no PK conflicts
            const insertQuery = `
              INSERT INTO ${tableName} (${insertFields.join(', ')})
              VALUES (${insertValues.join(', ')})
            `;
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] INSERT query: ${insertQuery}`);
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] INSERT fields: ${JSON.stringify(insertFields)}`);
            this.logger.debug(`[saveDetailTableInTransaction ${tableName}] Record keys: ${JSON.stringify(Object.keys(recordToUse))}`);
            await insertRequest.query(insertQuery);
          }
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
    // employees_attendance uses composite primary key (client_id, employee_id, period_id)
    // Pass empty string to indicate no single-column primary key exists
    await this.saveDetailTableInTransaction(
      transaction,
      employeeId,
      'employees_attendance',
      '', // No single-column PK - uses composite key (client_id, employee_id, period_id)
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
    // employees_bank_details table doesn't have a primary key column
    // It uses a composite key: employee_id + bank_code
    // Pass 'id' as the primary key column name, but the code will detect it doesn't exist
    // and handle it using the composite key approach
    await this.saveDetailTableInTransaction(
      transaction,
      employeeId,
      'employees_bank_details',
      'id', // This column doesn't exist - will be handled by composite key logic
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

  /**
   * Add a new employee using sp_add_employee stored procedure
   */
  async addEmployee(tenantCode: string, dto: any): Promise<{ status_code: number; status_message: string; employee_id?: string }> {
    const pool = await this.getTenantPool(tenantCode);
    
    try {
      const request = pool.request();
      
      // Mandatory parameters
      request.input('client_id', sql.NVarChar, tenantCode);
      request.input('employee_id', sql.NVarChar, dto.employee_id);
      request.input('tz_id', sql.NVarChar, dto.tz_id);
      request.input('first_name', sql.NVarChar, dto.first_name);
      request.input('last_name', sql.NVarChar, dto.last_name);
      request.input('gender', sql.NVarChar, dto.gender);
      request.input('date_of_birth', sql.Date, dto.date_of_birth ? new Date(dto.date_of_birth) : null);
      request.input('hire_date', sql.Date, dto.hire_date ? new Date(dto.hire_date) : null);
      request.input('employment_status', sql.NVarChar, dto.employment_status);
      request.input('department_number', sql.Int, dto.department_number);
      
      // Optional parameters
      if (dto.employment_percent !== undefined && dto.employment_percent !== null) {
        request.input('employment_percent', sql.Decimal(18, 2), dto.employment_percent);
      }
      if (dto.address_line1 !== undefined) {
        request.input('address_line1', sql.NVarChar, dto.address_line1 || null);
      }
      if (dto.address_line2 !== undefined) {
        request.input('address_line2', sql.NVarChar, dto.address_line2 || null);
      }
      if (dto.city_code !== undefined && dto.city_code !== null) {
        request.input('city_code', sql.Int, dto.city_code);
      }
      if (dto.zip_code !== undefined) {
        request.input('zip_code', sql.NVarChar, dto.zip_code || null);
      }
      if (dto.cell_phone_number !== undefined) {
        request.input('cell_phone_number', sql.NVarChar, dto.cell_phone_number || null);
      }
      if (dto.email !== undefined) {
        request.input('email', sql.NVarChar, dto.email || null);
      }
      if (dto.termination_date !== undefined) {
        request.input('termination_date', sql.Date, dto.termination_date ? new Date(dto.termination_date) : null);
      }
      if (dto.job_title !== undefined) {
        request.input('job_title', sql.NVarChar, dto.job_title || null);
      }
      if (dto.site_number !== undefined && dto.site_number !== null) {
        request.input('site_number', sql.Int, dto.site_number);
      }
      if (dto.manager_id !== undefined) {
        request.input('manager_id', sql.NVarChar, dto.manager_id || null);
      }
      if (dto.is_active !== undefined) {
        request.input('is_active', sql.Bit, dto.is_active !== false);
      }
      
      // Output parameters - must be declared BEFORE execute
      request.output('status_code', sql.Int);
      request.output('status_message', sql.NVarChar(400));
      
      this.logger.log(`[addEmployee] Calling sp_add_employee for employee_id: ${dto.employee_id}, tenant: ${tenantCode}`);
      this.logger.debug(`[addEmployee] Input parameters:`, {
        client_id: tenantCode,
        employee_id: dto.employee_id,
        tz_id: dto.tz_id,
        first_name: dto.first_name,
        last_name: dto.last_name,
        gender: dto.gender,
        date_of_birth: dto.date_of_birth,
        hire_date: dto.hire_date,
        employment_status: dto.employment_status,
        department_number: dto.department_number,
      });
      
      // Execute the stored procedure
      let result: any;
      try {
        result = await request.execute('sp_add_employee');
        this.logger.log(`[addEmployee] SP executed successfully`);
      } catch (spError: any) {
        this.logger.error(`[addEmployee] SP execution error:`, spError);
        throw new BadRequestException(`Stored procedure error: ${spError?.message || 'Unknown error'}`);
      }
      
      // Try to get status from output parameters
      let statusCode: number | null = null;
      let statusMessage: string | null = null;
      
      const statusCodeParam = request.parameters.status_code;
      const statusMessageParam = request.parameters.status_message;
      
      if (statusCodeParam && typeof statusCodeParam === 'object' && 'value' in statusCodeParam && statusCodeParam.value !== null) {
        statusCode = statusCodeParam.value;
        this.logger.log(`[addEmployee] Got status_code from output parameter: ${statusCode}`);
      }
      
      if (statusMessageParam && typeof statusMessageParam === 'object' && 'value' in statusMessageParam && statusMessageParam.value !== null) {
        statusMessage = statusMessageParam.value;
        this.logger.log(`[addEmployee] Got status_message from output parameter: ${statusMessage}`);
      }
      
      // Try to get from recordsets (SP may return SELECT with status)
      if ((statusCode === null || statusCode === undefined) && result?.recordsets && result.recordsets.length > 0) {
        const lastRecordset = result.recordsets[result.recordsets.length - 1];
        if (lastRecordset && lastRecordset.length > 0) {
          const firstRow = lastRecordset[0];
          if (firstRow.status_code !== undefined && firstRow.status_code !== null) {
            statusCode = firstRow.status_code;
            this.logger.log(`[addEmployee] Got status_code from recordset: ${statusCode}`);
          }
          if (firstRow.status_message !== undefined && firstRow.status_message !== null) {
            statusMessage = firstRow.status_message;
            this.logger.log(`[addEmployee] Got status_message from recordset: ${statusMessage}`);
          }
        }
      }
      
      // Also check single recordset
      if ((statusCode === null || statusCode === undefined) && result?.recordset && result.recordset.length > 0) {
        const firstRow = result.recordset[0];
        if (firstRow.status_code !== undefined && firstRow.status_code !== null) {
          statusCode = firstRow.status_code;
          this.logger.log(`[addEmployee] Got status_code from single recordset: ${statusCode}`);
        }
        if (firstRow.status_message !== undefined && firstRow.status_message !== null) {
          statusMessage = firstRow.status_message;
          this.logger.log(`[addEmployee] Got status_message from single recordset: ${statusMessage}`);
        }
      }
      
      // If we don't have status_code, check if employee was created in DB
      // This is a fallback - if SP ran without error and employee exists, assume success
      if (statusCode === null || statusCode === undefined) {
        this.logger.log(`[addEmployee] No status_code from SP, checking if employee was created in DB...`);
        try {
          const checkResult = await pool.request()
            .input('client_id', sql.NVarChar, tenantCode)
            .input('employee_id', sql.NVarChar, dto.employee_id)
            .query(`SELECT employee_id FROM employees WHERE client_id = @client_id AND employee_id = @employee_id`);
          
          if (checkResult.recordset && checkResult.recordset.length > 0) {
            // Employee was created successfully
            this.logger.log(`[addEmployee] Employee found in DB - assuming success (status_code = 0)`);
            statusCode = 0;
            statusMessage = statusMessage || 'Employee created successfully';
          } else {
            // Employee not found - SP may have failed silently or returned error code
            this.logger.warn(`[addEmployee] Employee not found in DB after SP execution`);
            statusCode = 99; // Unknown error
            statusMessage = statusMessage || 'Employee creation may have failed - please verify';
          }
        } catch (checkError: any) {
          this.logger.error(`[addEmployee] Error checking if employee was created:`, checkError);
          statusCode = 99;
          statusMessage = 'Unable to verify employee creation';
        }
      }
      
      this.logger.log(`[addEmployee] Final status_code: ${statusCode}, status_message: ${statusMessage}`);
      
      return {
        status_code: statusCode,
        status_message: statusMessage || 'Unknown error',
        employee_id: statusCode === 0 ? dto.employee_id : undefined,
      };
    } catch (error: any) {
      this.logger.error(`[addEmployee] Error calling sp_add_employee:`, error);
      throw error;
    }
  }
}

