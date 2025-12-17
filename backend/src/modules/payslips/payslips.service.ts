import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { BaseTenantService } from '../../common/services/base-tenant.service';
import { TenantResolverService } from '../auth/tenant-resolver.service';
import * as sql from 'mssql';
import { PayslipResponseDto } from './dto/payslip-response.dto';
import { mockPayslipData, mockPayslipList } from './mock-payslip-data';
import { PdfGeneratorService } from './pdf-generator.service';
import { PdfGeneratorHtmlService } from './pdf-generator-html.service';

@Injectable()
export class PayslipsService extends BaseTenantService {
  private readonly logger = new Logger(PayslipsService.name);

  constructor(
    tenantResolver: TenantResolverService,
    private pdfGenerator: PdfGeneratorService,
    private pdfGeneratorHtml: PdfGeneratorHtmlService,
  ) {
    super(tenantResolver);
  }

  async getPayslip(
    payslipId: string,
    tenantId: string,
    tenantCode: string,
    userId: string,
    userRole: string,
  ): Promise<PayslipResponseDto> {
    // TODO: Replace with real database queries when payroll processing is connected
    // For now, return mock data for demonstration
    this.logger.log(`[MOCK] Returning mock payslip data for ${payslipId}`);
    
    // Return mock data with the requested payslip ID
    const mockData = {
      ...mockPayslipData,
      payslip: {
        ...mockPayslipData.payslip,
        id: payslipId,
      },
    };

    // Adjust permissions based on role
    mockData.permissions.can_edit = userRole === 'PAYROLL_MANAGER';

    return mockData as PayslipResponseDto;

    /* 
    // REAL DATABASE CODE (commented out for now)
    const pool = await this.getTenantPool(tenantCode);

    try {
      const payslipResult = await pool
        .request()
        .input('payslipId', sql.NVarChar, payslipId)
        .input('tenantId', sql.UniqueIdentifier, tenantId)
        .query(`
          SELECT 
            ps.id,
            ps.month,
            ps.year,
            ps.employee_id,
            ps.generation_date,
            ps.version,
            ps.company_name,
            ps.company_registration_number
          FROM payslips ps
          WHERE ps.id = @payslipId AND ps.tenant_id = @tenantId
        `);

      if (payslipResult.recordset.length === 0) {
        throw new NotFoundException(`Payslip ${payslipId} not found`);
      }

      const payslip = payslipResult.recordset[0];

      if (userRole === 'EMPLOYEE' && payslip.employee_id !== userId) {
        throw new ForbiddenException('Access denied: You can only view your own payslips');
      }

      const [employee, earnings, deductions, totals, attendance, balances] = await Promise.all([
        this.getEmployeeData(pool, payslip.employee_id),
        this.getEarnings(pool, payslipId),
        this.getDeductions(pool, payslipId),
        this.getTotals(pool, payslipId),
        this.getAttendance(pool, payslipId),
        this.getBalances(pool, payslipId),
      ]);

      const canEdit = userRole === 'PAYROLL_MANAGER';
      const canDownloadPDF = true;

      return {
        payslip: {
          id: payslip.id,
          month: payslip.month,
          year: payslip.year,
          generation_date: payslip.generation_date.toISOString(),
          version: payslip.version || '1.0',
        },
        company: {
          name: payslip.company_name || 'Company Name',
          registration_number: payslip.company_registration_number || '',
        },
        employee,
        earnings,
        deductions,
        totals,
        attendance,
        balances,
        permissions: {
          can_edit: canEdit,
          can_download_pdf: canDownloadPDF,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get payslip ${payslipId}:`, error);
      throw error;
    }
    */
  }

  private async getEmployeeData(pool: sql.ConnectionPool, employeeId: string): Promise<any> {
    const result = await pool
      .request()
      .input('employeeId', sql.NVarChar, employeeId)
      .query(`
        SELECT 
          e.employee_id,
          e.first_name,
          e.last_name,
          e.tz_id as national_id,
          e.address,
          e.hire_date as employment_start_date,
          DATEDIFF(YEAR, e.hire_date, GETDATE()) as seniority_years,
          e.job_percentage,
          e.department_number,
          e.work_center,
          e.job_title as position,
          e.grade,
          e.marital_status,
          bd.bank_name,
          bd.branch_code as branch_number,
          bd.account_number
        FROM employees e
        LEFT JOIN employee_bank_details bd ON e.employee_id = bd.employee_id AND bd.is_primary = 1
        WHERE e.employee_id = @employeeId AND e.is_active = 1
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }

    const row = result.recordset[0];
    return {
      full_name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.employee_id,
      employee_id: row.employee_id,
      national_id: row.national_id || '',
      address: row.address || '',
      employment_start_date: row.employment_start_date?.toISOString() || '',
      seniority_years: row.seniority_years || 0,
      job_percentage: row.job_percentage || 100,
      department: row.department_number ? String(row.department_number) : '',
      work_center: row.work_center || '',
      position: row.position || '',
      grade: row.grade || '',
      marital_status: row.marital_status || '',
      bank_name: row.bank_name || '',
      branch_number: row.branch_number || '',
      account_number: row.account_number || '',
    };
  }

  private async getEarnings(pool: sql.ConnectionPool, payslipId: string): Promise<any[]> {
    const result = await pool
      .request()
      .input('payslipId', sql.NVarChar, payslipId)
      .query(`
        SELECT 
          code,
          description,
          quantity,
          rate,
          taxable_value,
          amount,
          explanation
        FROM payslip_earnings
        WHERE payslip_id = @payslipId
        ORDER BY code
      `);

    return result.recordset.map((row: any) => ({
      code: row.code || '',
      description: row.description || '',
      quantity: row.quantity || 0,
      rate: parseFloat(row.rate) || 0,
      taxable_value: parseFloat(row.taxable_value) || 0,
      amount: parseFloat(row.amount) || 0,
      explanation: row.explanation || undefined,
    }));
  }

  private async getDeductions(pool: sql.ConnectionPool, payslipId: string): Promise<any[]> {
    const result = await pool
      .request()
      .input('payslipId', sql.NVarChar, payslipId)
      .query(`
        SELECT 
          description,
          amount
        FROM payslip_deductions
        WHERE payslip_id = @payslipId
        ORDER BY description
      `);

    return result.recordset.map((row: any) => ({
      description: row.description || '',
      amount: parseFloat(row.amount) || 0,
    }));
  }

  private async getTotals(pool: sql.ConnectionPool, payslipId: string): Promise<any> {
    const result = await pool
      .request()
      .input('payslipId', sql.NVarChar, payslipId)
      .query(`
        SELECT 
          total_earnings,
          total_deductions,
          net_salary,
          taxable_salary,
          insured_salary,
          tax_percentage,
          credit_points
        FROM payslip_totals
        WHERE payslip_id = @payslipId
      `);

    if (result.recordset.length === 0) {
      return {
        total_earnings: 0,
        total_deductions: 0,
        net_salary: 0,
        taxable_salary: 0,
        insured_salary: 0,
        tax_percentage: 0,
        credit_points: 0,
      };
    }

    const row = result.recordset[0];
    return {
      total_earnings: parseFloat(row.total_earnings) || 0,
      total_deductions: parseFloat(row.total_deductions) || 0,
      net_salary: parseFloat(row.net_salary) || 0,
      taxable_salary: parseFloat(row.taxable_salary) || 0,
      insured_salary: parseFloat(row.insured_salary) || 0,
      tax_percentage: parseFloat(row.tax_percentage) || 0,
      credit_points: row.credit_points || 0,
    };
  }

  private async getAttendance(pool: sql.ConnectionPool, payslipId: string): Promise<any> {
    const result = await pool
      .request()
      .input('payslipId', sql.NVarChar, payslipId)
      .query(`
        SELECT 
          work_days,
          work_hours,
          absence_days
        FROM payslip_attendance
        WHERE payslip_id = @payslipId
      `);

    if (result.recordset.length === 0) {
      return {
        work_days: 0,
        work_hours: 0,
        absence_days: 0,
      };
    }

    const row = result.recordset[0];
    return {
      work_days: row.work_days || 0,
      work_hours: row.work_hours || 0,
      absence_days: row.absence_days || 0,
    };
  }

  private async getBalances(pool: sql.ConnectionPool, payslipId: string): Promise<any> {
    const result = await pool
      .request()
      .input('payslipId', sql.NVarChar, payslipId)
      .query(`
        SELECT 
          vacation_previous_balance,
          vacation_accrued,
          vacation_used,
          vacation_new_balance,
          sick_previous_balance,
          sick_accrued,
          sick_used,
          sick_new_balance
        FROM payslip_balances
        WHERE payslip_id = @payslipId
      `);

    if (result.recordset.length === 0) {
      return {
        vacation: {
          previous_balance: 0,
          accrued: 0,
          used: 0,
          new_balance: 0,
        },
        sick: {
          previous_balance: 0,
          accrued: 0,
          used: 0,
          new_balance: 0,
        },
      };
    }

    const row = result.recordset[0];
    return {
      vacation: {
        previous_balance: parseFloat(row.vacation_previous_balance) || 0,
        accrued: parseFloat(row.vacation_accrued) || 0,
        used: parseFloat(row.vacation_used) || 0,
        new_balance: parseFloat(row.vacation_new_balance) || 0,
      },
      sick: {
        previous_balance: parseFloat(row.sick_previous_balance) || 0,
        accrued: parseFloat(row.sick_accrued) || 0,
        used: parseFloat(row.sick_used) || 0,
        new_balance: parseFloat(row.sick_new_balance) || 0,
      },
    };
  }

  async generatePDF(
    payslipId: string,
    tenantId: string,
    tenantCode: string,
    userId: string,
    userRole: string,
  ): Promise<Buffer> {
    // Get payslip data (currently returns mock data)
    const payslipData = await this.getPayslip(payslipId, tenantId, tenantCode, userId, userRole);

    // Use Puppeteer-based generator (better Hebrew/RTL support)
    // Falls back to pdfkit if puppeteer is not available
    try {
      return await this.pdfGeneratorHtml.generatePayslipPDF(payslipData);
    } catch (error) {
      this.logger.warn('Puppeteer PDF generation failed, using pdfkit fallback');
      return this.pdfGenerator.generatePayslipPDF(payslipData);
    }
  }

  async createPayslip(
    dto: { employee_id: string; month: number; year: number; version?: string },
    tenantId: string,
    tenantCode: string,
  ): Promise<string> {
    // TODO: Replace with real database insert when payroll processing is connected
    // For now, return a mock payslip ID
    this.logger.log(`[MOCK] Creating mock payslip for employee ${dto.employee_id}, ${dto.month}/${dto.year}`);
    
    const payslipId = `PS-${dto.year}${String(dto.month).padStart(2, '0')}-${dto.employee_id}-${Date.now()}`;
    
    this.logger.log(`[MOCK] Generated payslip ID: ${payslipId}`);
    return payslipId;

    /* 
    // REAL DATABASE CODE (commented out for now)
    const pool = await this.getTenantPool(tenantCode);

    try {
      // Check if employee exists
      const employeeResult = await pool
        .request()
        .input('employeeId', sql.NVarChar, dto.employee_id)
        .query(`
          SELECT employee_id, first_name, last_name
          FROM employees
          WHERE employee_id = @employeeId AND is_active = 1
        `);

      if (employeeResult.recordset.length === 0) {
        throw new NotFoundException(`Employee ${dto.employee_id} not found`);
      }

      const employee = employeeResult.recordset[0];

      // Check if payslip already exists for this month/year
      const existingResult = await pool
        .request()
        .input('employeeId', sql.NVarChar, dto.employee_id)
        .input('month', sql.Int, dto.month)
        .input('year', sql.Int, dto.year)
        .input('tenantId', sql.UniqueIdentifier, tenantId)
        .query(`
          SELECT id FROM payslips
          WHERE employee_id = @employeeId 
            AND month = @month 
            AND year = @year
            AND tenant_id = @tenantId
        `);

      if (existingResult.recordset.length > 0) {
        throw new Error(`Payslip already exists for employee ${dto.employee_id} for ${dto.month}/${dto.year}`);
      }

      // Generate payslip ID
      const payslipId = `PS-${dto.year}${String(dto.month).padStart(2, '0')}-${dto.employee_id}-${Date.now()}`;

      // ... rest of database insert code ...
      
      this.logger.log(`Created payslip ${payslipId} for employee ${dto.employee_id}`);
      return payslipId;
    } catch (error) {
      this.logger.error(`Failed to create payslip:`, error);
      throw error;
    }
    */
  }

  async listPayslips(
    tenantId: string,
    tenantCode: string,
    userId: string,
    userRole: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ payslips: any[]; total: number; page: number; limit: number; totalPages: number }> {
    // TODO: Replace with real database queries when payroll processing is connected
    // For now, return mock data for demonstration
    this.logger.log(`[MOCK] Returning mock payslips list`);

    let filteredPayslips = mockPayslipList;
    
    // Filter by employee if role is EMPLOYEE
    if (userRole === 'EMPLOYEE') {
      filteredPayslips = mockPayslipList.filter(p => p.employee_id === userId);
    }

    const total = filteredPayslips.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const payslips = filteredPayslips.slice(offset, offset + limit);

    return {
      payslips,
      total,
      page,
      limit,
      totalPages,
    };

    /* 
    // REAL DATABASE CODE (commented out for now)
    const pool = await this.getTenantPool(tenantCode);

    try {
      let query = `
        SELECT 
          ps.id,
          ps.month,
          ps.year,
          ps.employee_id,
          ps.generation_date,
          pt.net_salary,
          e.first_name,
          e.last_name
        FROM payslips ps
        LEFT JOIN employees e ON ps.employee_id = e.employee_id
        LEFT JOIN payslip_totals pt ON ps.id = pt.payslip_id
        WHERE ps.tenant_id = @tenantId
      `;

      if (userRole === 'EMPLOYEE') {
        query += ` AND ps.employee_id = @userId`;
      }

      query += ` ORDER BY ps.year DESC, ps.month DESC, ps.generation_date DESC`;

      const result = await pool
        .request()
        .input('tenantId', sql.UniqueIdentifier, tenantId)
        .input('userId', sql.NVarChar, userId)
        .query(query);

      const allPayslips = result.recordset.map((row: any) => ({
        id: row.id,
        month: row.month,
        year: row.year,
        employee_name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.employee_id,
        employee_id: row.employee_id,
        net_salary: parseFloat(row.net_salary) || 0,
        generation_date: row.generation_date?.toISOString() || '',
      }));

      const total = allPayslips.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const payslips = allPayslips.slice(offset, offset + limit);

      return {
        payslips,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to list payslips:`, error);
      throw error;
    }
    */
  }
}

