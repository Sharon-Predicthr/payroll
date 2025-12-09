import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseTenantService } from '../../common/services/base-tenant.service';
import { TenantResolverService } from '../auth/tenant-resolver.service';
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
  pension_profile?: EmployeePensionProfile;
  tax_profile?: EmployeeTaxProfile;
  attendance?: EmployeeAttendance[];
  contracts?: EmployeeContract[];
  leave_balances?: EmployeeLeaveBalance[];
}

@Injectable()
export class EmployeesService extends BaseTenantService {
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
      
      // Map actual database columns to our interface
      // Based on the actual schema:
      const employee: Employee = {
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
      const result = await pool
        .request()
        .input('employeeId', sql.UniqueIdentifier, employeeId)
        .query(`
          SELECT 
            id,
            employee_id,
            bank_name,
            account_number,
            branch_code,
            account_type,
            is_primary
          FROM employee_bank_details
          WHERE employee_id = @employeeId
          ORDER BY is_primary DESC, bank_name
        `);

      return result.recordset.map((row: any) => ({
        id: row.id,
        employee_id: row.employee_id,
        bank_name: row.bank_name,
        account_number: row.account_number,
        branch_code: row.branch_code,
        account_type: row.account_type,
        is_primary: row.is_primary,
      }));
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
      const result = await pool
        .request()
        .input('employeeId', sql.UniqueIdentifier, employeeId)
        .query(`
          SELECT 
            id,
            employee_id,
            pay_item_type,
            item_name,
            amount,
            is_active
          FROM employee_pay_items
          WHERE employee_id = @employeeId
          ORDER BY pay_item_type, item_name
        `);

      return result.recordset.map((row: any) => ({
        id: row.id,
        employee_id: row.employee_id,
        pay_item_type: row.pay_item_type,
        item_name: row.item_name,
        amount: row.amount,
        is_active: row.is_active,
      }));
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
  ): Promise<EmployeePensionProfile | null> {
    try {
      const result = await pool
        .request()
        .input('employeeId', sql.UniqueIdentifier, employeeId)
        .query(`
          SELECT 
            id,
            employee_id,
            pension_provider,
            pension_number,
            contribution_rate,
            employer_contribution_rate
          FROM employee_pension_profile
          WHERE employee_id = @employeeId
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      const row = result.recordset[0];
      return {
        id: row.id,
        employee_id: row.employee_id,
        pension_provider: row.pension_provider,
        pension_number: row.pension_number,
        contribution_rate: row.contribution_rate,
        employer_contribution_rate: row.employer_contribution_rate,
      };
    } catch (error) {
      console.error('Error fetching pension profile:', error);
      return null;
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
        .input('employeeId', sql.UniqueIdentifier, employeeId)
        .query(`
          SELECT 
            id,
            employee_id,
            tax_id,
            filing_status,
            exemptions,
            additional_withholding
          FROM employee_tax_profile
          WHERE employee_id = @employeeId
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      const row = result.recordset[0];
      return {
        id: row.id,
        employee_id: row.employee_id,
        tax_id: row.tax_id,
        filing_status: row.filing_status,
        exemptions: row.exemptions,
        additional_withholding: row.additional_withholding,
      };
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
      const result = await pool
        .request()
        .input('employeeId', sql.UniqueIdentifier, employeeId)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT TOP (@limit)
            id,
            employee_id,
            date,
            check_in,
            check_out,
            hours_worked,
            status
          FROM employees_attendance
          WHERE employee_id = @employeeId
          ORDER BY date DESC
        `);

      return result.recordset.map((row: any) => ({
        id: row.id,
        employee_id: row.employee_id,
        date: row.date,
        check_in: row.check_in,
        check_out: row.check_out,
        hours_worked: row.hours_worked,
        status: row.status,
      }));
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
      const result = await pool
        .request()
        .input('employeeId', sql.UniqueIdentifier, employeeId)
        .query(`
          SELECT 
            id,
            employee_id,
            contract_type,
            start_date,
            end_date,
            salary,
            status
          FROM employees_contracts
          WHERE employee_id = @employeeId
          ORDER BY start_date DESC
        `);

      return result.recordset.map((row: any) => ({
        id: row.id,
        employee_id: row.employee_id,
        contract_type: row.contract_type,
        start_date: row.start_date,
        end_date: row.end_date,
        salary: row.salary,
        status: row.status,
      }));
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
      const result = await pool
        .request()
        .input('employeeId', sql.UniqueIdentifier, employeeId)
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
      console.error('Error fetching leave balances:', error);
      return [];
    }
  }

  /**
   * Terminate/Delete employee - deletes from master and all detail tables
   */
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
        'employees_leave_balances',
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
}

