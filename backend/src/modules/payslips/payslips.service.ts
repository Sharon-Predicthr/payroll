import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { BaseTenantService } from '../../common/services/base-tenant.service';
import { TenantResolverService } from '../auth/tenant-resolver.service';
import * as sql from 'mssql';
import { PayslipResponseDto } from './dto/payslip-response.dto';
import { mockPayslipData, mockPayslipList } from './mock-payslip-data';
import { PdfGeneratorService } from './pdf-generator.service';
import { PdfGeneratorHtmlService } from './pdf-generator-html.service';
import { PdfGeneratorHtmlTemplate2Service } from './pdf-generator-html-template2.service';

@Injectable()
export class PayslipsService extends BaseTenantService {
  private readonly logger = new Logger(PayslipsService.name);

  constructor(
    tenantResolver: TenantResolverService,
    private pdfGenerator: PdfGeneratorService,
    private pdfGeneratorHtml: PdfGeneratorHtmlService,
    private pdfGeneratorHtmlTemplate2: PdfGeneratorHtmlTemplate2Service,
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
    const pool = await this.getTenantPool(tenantCode);

    try {
      // Get payslip header from clc_payslips
      // First, let's check what columns exist in the table
      let columnsCheck;
      try {
        columnsCheck = await pool
          .request()
          .query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'clc_payslips'
            ORDER BY ORDINAL_POSITION
          `);
      } catch (error) {
        this.logger.warn(`[getPayslip] Could not check columns, using default query`);
        columnsCheck = { recordset: [] };
      }
      
      const availableColumns = columnsCheck.recordset.map((r: any) => r.COLUMN_NAME);
      this.logger.log(`[getPayslip] Available columns in clc_payslips:`, availableColumns);
      
      // Build SELECT query dynamically based on available columns
      // Note: clc_payslips doesn't have payslip_id, so we'll create a composite ID
      // Use + for SQL Server string concatenation
      const selectFields: string[] = [
        "period_id + '-' + employee_id as id", // Composite ID
        'period_id',
        'employee_id'
      ];
      
      // Add salary fields if available - check for clc_payslips column names
      const salaryFields = [
        { db: 'net_salary', alias: 'net_salary' },
        { db: 'net_pay', alias: 'net_salary' },
        { db: 'net_pay_month', alias: 'net_salary' },
        { db: 'final_salary', alias: 'net_salary' },
        { db: 'gross_salary', alias: 'gross_salary' },
        { db: 'gross_pay', alias: 'gross_salary' },
        { db: 'gross_earnings_month', alias: 'gross_salary' },
        { db: 'taxable_salary', alias: 'taxable_salary' },
        { db: 'taxable_pay', alias: 'taxable_salary' },
        { db: 'gross_for_tax_month', alias: 'taxable_salary' },
        { db: 'insured_salary', alias: 'insured_salary' },
        { db: 'insured_pay', alias: 'insured_salary' },
        { db: 'gross_for_bl_month', alias: 'insured_salary' },
        { db: 'tax_amount', alias: 'tax_amount' },
        { db: 'national_insurance', alias: 'national_insurance' },
        { db: 'health_tax', alias: 'health_tax' },
        { db: 'pension_amount', alias: 'pension_amount' },
        { db: 'total_deductions', alias: 'total_deductions' },
        { db: 'total_deductions_month', alias: 'total_deductions' },
        { db: 'work_days', alias: 'work_days' },
        { db: 'work_hours', alias: 'work_hours' },
        { db: 'absence_days', alias: 'absence_days' },
        { db: 'credit_points', alias: 'credit_points' },
        { db: 'tax_credit_points', alias: 'credit_points' },
        { db: 'tax_percentage', alias: 'tax_percentage' },
        { db: 'tax_pct_level', alias: 'tax_percentage' }
      ];
      
      const addedFields = new Set<string>();
      for (const field of salaryFields) {
        if (availableColumns.includes(field.db) && !addedFields.has(field.alias)) {
          selectFields.push(`${field.db} as ${field.alias}`);
          addedFields.add(field.alias);
        }
      }
      
      // Add defaults for missing fields (only add if not already added)
      const requiredFields = ['net_salary', 'gross_salary', 'taxable_salary', 'insured_salary', 
                             'tax_amount', 'national_insurance', 'health_tax', 'pension_amount', 
                             'total_deductions', 'work_days', 'work_hours', 'absence_days', 
                             'credit_points', 'tax_percentage'];
      
      for (const field of requiredFields) {
        if (!addedFields.has(field)) {
          selectFields.push(`0 as ${field}`);
        }
      }
      
      // Add ALL additional fields from clc_payslips for additional_data
      // These will be used by getAdditionalPayslipData
      const additionalFields = [
        // General Information fields
        'department_number', 'employee_address', 'employee_national_id',
        'tariff_monthly', 'tariff_daily', 'tariff_hourly',
        'start_of_work', 'seniority_years', 'seniority_months',
        'job_pct', 'partial_period_pct', 'tax_credit_points', 'tax_pct_level',
        'ytd_months_of_work', 'total_months_worked',
        // Monthly Tax Information fields
        'severance_monthly', 'severance_gross_monthly',
        'kpg_employer_monthly', 'kpg_gross_monthly',
        'khs_employer_monthly', 'khs_gross_monthly',
        'city_tax_credit_month', 'seif_47_exempt_month', 'shovi_monthly',
        // Yearly/Accumulated Information fields
        'ytd_gross_payments', 'ytd_shovi', 'ytd_gross_for_tax', 'ytd_tax',
        'ytd_bl_employee', 'ytd_bl_employer',
        'ytd_health_employee', 'ytd_health_employer',
        'ytd_35_tax_exempt', 'ytd_khs_employer', 'ytd_khs_employee',
        'ytd_47_tax_deduction', 'ytd_pension_employer', 'ytd_pension_employee',
        'ytd_severance_employer',
        // Additional YTD fields that might exist
        'ytd_credit_points_amount', 'ytd_city_tax_credit', 'ytd_total_tax_credit'
      ];
      
      for (const field of additionalFields) {
        if (availableColumns.includes(field) && !addedFields.has(field)) {
          selectFields.push(field);
          addedFields.add(field);
        }
      }
      
      // Add generation_date or created_date if available
      if (availableColumns.includes('generation_date')) {
        selectFields.push('generation_date');
      } else if (availableColumns.includes('created_date')) {
        selectFields.push('created_date as generation_date');
      } else if (availableColumns.includes('calc_date')) {
        selectFields.push('calc_date as generation_date');
      } else {
        // Use GETDATE() as fallback
        selectFields.push('GETDATE() as generation_date');
      }
      
      // Parse payslipId - it might be in format "period_id-employee_id" or just period_id
      // If it's composite, split it; otherwise, we'll need to match by period_id and employee_id
      let periodId: string;
      let employeeId: string | null = null;
      
      if (payslipId.includes('-')) {
        const parts = payslipId.split('-');
        if (parts.length >= 2) {
          // Format: "YYYY-MM-employee_id" or "period_id-employee_id"
          const lastPart = parts[parts.length - 1];
          // Check if last part looks like employee_id (not a month number)
          if (lastPart.length > 2 || isNaN(parseInt(lastPart))) {
            employeeId = lastPart;
            periodId = parts.slice(0, -1).join('-');
          } else {
            // Format: "YYYY-MM" - need to find by period_id only
            periodId = payslipId;
          }
        } else {
          periodId = payslipId;
        }
      } else {
        periodId = payslipId;
      }

      // Use LTRIM/RTRIM for string comparison to handle whitespace issues
      let whereClause = 'LTRIM(RTRIM(period_id)) = LTRIM(RTRIM(@periodId)) AND LTRIM(RTRIM(client_id)) = LTRIM(RTRIM(@clientId))';
      const request = pool.request()
        .input('periodId', sql.NVarChar, periodId.trim())
        .input('clientId', sql.NVarChar, tenantCode.trim());
      
      if (employeeId) {
        whereClause += ' AND LTRIM(RTRIM(employee_id)) = LTRIM(RTRIM(@employeeId))';
        request.input('employeeId', sql.NVarChar, employeeId.trim());
      }

      const selectQuery = `SELECT ${selectFields.join(', ')} FROM clc_payslips WHERE ${whereClause}`;
      this.logger.log(`[getPayslip] SELECT query fields: ${selectFields.length} fields`);
      this.logger.log(`[getPayslip] SELECT includes YTD fields: ytd_gross_payments=${selectFields.includes('ytd_gross_payments')}, ytd_tax=${selectFields.includes('ytd_tax')}, ytd_health_employee=${selectFields.includes('ytd_health_employee')}`);
      this.logger.log(`[getPayslip] About to execute SELECT query for period: ${periodId}, employee: ${employeeId || 'ALL'}`);
      
      const payslipResult = await request.query(selectQuery);
      this.logger.log(`[getPayslip] SELECT query executed, returned ${payslipResult.recordset.length} rows`);

      if (payslipResult.recordset.length === 0) {
        throw new NotFoundException(`Payslip ${payslipId} not found`);
      }

      const payslip = payslipResult.recordset[0];
      this.logger.log(`[getPayslip] Payslip object keys after SELECT: ${Object.keys(payslip).join(', ')}`);
      this.logger.log(`[getPayslip] Sample YTD fields: ytd_gross_payments=${payslip.ytd_gross_payments}, ytd_tax=${payslip.ytd_tax}, ytd_health_employee=${payslip.ytd_health_employee}`);
      this.logger.log(`[getPayslip] Reached line 205, about to check user permissions`);

      if (userRole === 'EMPLOYEE' && payslip.employee_id !== userId) {
        throw new ForbiddenException('Access denied: You can only view your own payslips');
      }

      // Extract month and year from period_id (format: 'YYYY-MM')
      const [year, month] = payslip.period_id.split('-').map(Number);

      // Get employee data
      const employee = await this.getEmployeeDataFromPayslip(pool, payslip.employee_id, tenantCode, payslip.period_id);

      // Check available columns in clc_payslip_lines
      const payslipLinesColsResult = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'clc_payslip_lines'
            AND TABLE_SCHEMA = SCHEMA_NAME()
        `);
      const payslipLinesCols = payslipLinesColsResult.recordset.map((r: any) => r.COLUMN_NAME);
      
      // Helper function to get column or default
      const getColumnOrDefault = (colName: string, defaultValue: string = "''") => {
        return payslipLinesCols.includes(colName) ? colName : defaultValue;
      };

      // Get payments (item_type = '1-payment')
      // Parse payslipId to get period_id and employee_id
      // Use item_name if available, otherwise use item_description
      const hasItemName = payslipLinesCols.includes('item_name');
      const hasItemDescription = payslipLinesCols.includes('item_description');
      
      const paymentSelectFields = [
        payslipLinesCols.includes('item_code') ? 'item_code as code' : "'' as code",
        // Use item_name if available, otherwise item_description, otherwise empty
        hasItemName ? 'item_name as description' : 
          hasItemDescription ? 'item_description as description' : "'' as description",
        payslipLinesCols.includes('quantity') ? 'quantity' : '0 as quantity',
        payslipLinesCols.includes('rate') ? 'rate' : '0 as rate',
        payslipLinesCols.includes('taxable_value') ? 'taxable_value' : '0 as taxable_value',
        payslipLinesCols.includes('amount') ? 'amount' : '0 as amount',
      ];
      if (payslipLinesCols.includes('explanation')) {
        paymentSelectFields.push('explanation');
      } else {
        paymentSelectFields.push("'' as explanation");
      }

      const paymentsResult = await pool
        .request()
        .input('periodId', sql.NVarChar, periodId)
        .input('employeeId', sql.NVarChar, employeeId || payslip.employee_id)
        .query(`
          SELECT ${paymentSelectFields.join(', ')}
          FROM clc_payslip_lines
          WHERE period_id = @periodId 
            AND employee_id = @employeeId
            AND item_type = '1-payment'
          ORDER BY ${payslipLinesCols.includes('item_code') ? 'item_code' : '1'}
        `);

      const payments = paymentsResult.recordset.map((row: any) => ({
        code: row.code || '',
        description: row.description || '',
        quantity: parseFloat(row.quantity) || 0,
        rate: parseFloat(row.rate) || 0,
        taxable_value: parseFloat(row.taxable_value) || 0,
        amount: parseFloat(row.amount) || 0,
        explanation: payslipLinesCols.includes('explanation') ? (row.explanation || undefined) : undefined,
      }));

      // Get mandatory deductions (item_type IN ('2-DEDUCTION', '3-INSURANCE', '4-KH-EDUCATION'))
      const hasItemNameMandatory = payslipLinesCols.includes('item_name');
      const hasItemDescriptionMandatory = payslipLinesCols.includes('item_description');
      const mandatoryDeductionFields = [
        hasItemNameMandatory ? 'item_name as description' : 
          hasItemDescriptionMandatory ? 'item_description as description' : "'' as description",
        payslipLinesCols.includes('amount') ? 'amount' : '0 as amount',
      ];
      const mandatoryDeductionsResult = await pool
        .request()
        .input('periodId', sql.NVarChar, periodId)
        .input('employeeId', sql.NVarChar, employeeId || payslip.employee_id)
        .query(`
          SELECT ${mandatoryDeductionFields.join(', ')}
          FROM clc_payslip_lines
          WHERE period_id = @periodId 
            AND employee_id = @employeeId
            AND item_type IN ('2-DEDUCTION', '3-INSURANCE', '4-KH-EDUCATION')
          ORDER BY ${payslipLinesCols.includes('item_type') ? 'item_type' : '1'}, ${payslipLinesCols.includes('item_description') ? 'item_description' : '1'}
        `);

      const mandatoryDeductions = mandatoryDeductionsResult.recordset.map((row: any) => ({
        description: row.description || '',
        amount: parseFloat(row.amount) || 0,
      }));

      // Get personal/optional deductions (item_type = '5-DEDUCTION')
      const hasItemNamePersonal = payslipLinesCols.includes('item_name');
      const hasItemDescriptionPersonal = payslipLinesCols.includes('item_description');
      const personalDeductionFields = [
        hasItemNamePersonal ? 'item_name as description' : 
          hasItemDescriptionPersonal ? 'item_description as description' : "'' as description",
        payslipLinesCols.includes('amount') ? 'amount' : '0 as amount',
      ];
      const personalDeductionsResult = await pool
        .request()
        .input('periodId', sql.NVarChar, periodId)
        .input('employeeId', sql.NVarChar, employeeId || payslip.employee_id)
        .query(`
          SELECT ${personalDeductionFields.join(', ')}
          FROM clc_payslip_lines
          WHERE period_id = @periodId 
            AND employee_id = @employeeId
            AND item_type = '5-DEDUCTION'
          ORDER BY ${payslipLinesCols.includes('item_description') ? 'item_description' : '1'}
        `);

      const personalDeductions = personalDeductionsResult.recordset.map((row: any) => ({
        description: row.description || '',
        amount: parseFloat(row.amount) || 0,
      }));

      // Combine all deductions for backward compatibility
      const deductions = [...mandatoryDeductions, ...personalDeductions];

      // Get leave balances
      const balances = await this.getLeaveBalances(pool, payslip.employee_id, payslip.period_id, tenantCode);

      // Get company info (from tenant or separate table)
      const companyInfo = await this.getCompanyInfo(pool, tenantCode);

      const canEdit = userRole === 'PAYROLL_MANAGER';
      const canDownloadPDF = true;

      // Get additional data from clc_payslips and related tables
      let additionalData: any = {};
      this.logger.log(`[getPayslip] Reached line 342, about to fetch additional data`);
      this.logger.log(`[getPayslip] About to call getAdditionalPayslipData for employee: ${employeeId || payslip.employee_id}, period: ${payslip.period_id}`);
      try {
        additionalData = await this.getAdditionalPayslipData(pool, payslip, employeeId || payslip.employee_id, tenantCode);
        this.logger.log(`[getPayslip] Additional data fetched successfully:`, JSON.stringify(additionalData, null, 2));
        this.logger.log(`[getPayslip] Additional data has yearly_accumulated_info: ${!!additionalData?.yearly_accumulated_info}`);
        if (additionalData?.yearly_accumulated_info) {
          this.logger.log(`[getPayslip] Yearly info keys: ${Object.keys(additionalData.yearly_accumulated_info).join(', ')}`);
        }
      } catch (error: any) {
        this.logger.error(`[getPayslip] ERROR fetching additional payslip data: ${error.message}`, error.stack);
        // Continue without additional data instead of failing the entire request
      }

      const result = {
        payslip: {
          id: payslip.id,
          month: month || 1,
          year: year || new Date().getFullYear(),
          generation_date: payslip.generation_date?.toISOString() || new Date().toISOString(),
          version: '1.0',
        },
        company: {
          name: companyInfo.name || '',
          registration_number: companyInfo.registration_number || '',
        },
        employee,
        earnings: payments,
        deductions: deductions.map(d => ({
          description: d.description,
          amount: d.amount,
        })),
        mandatory_deductions: mandatoryDeductions,
        personal_deductions: personalDeductions,
        totals: {
          total_earnings: parseFloat(payslip.gross_salary || payslip.gross_earnings_month || 0) || 0,
          total_deductions: parseFloat(payslip.total_deductions || payslip.total_deductions_month || 0) || 0,
          net_salary: parseFloat(payslip.net_salary || payslip.net_pay_month || payslip.net_pay || 0) || 0,
          taxable_salary: parseFloat(payslip.taxable_salary || payslip.gross_for_tax_month || 0) || 0,
          insured_salary: parseFloat(payslip.insured_salary || payslip.gross_for_bl_month || 0) || 0,
          tax_percentage: parseFloat(payslip.tax_percentage || payslip.tax_pct_level || 0) || 0,
          credit_points: parseFloat(payslip.credit_points || payslip.tax_credit_points || 0) || 0,
        },
        attendance: {
          work_days: parseFloat(payslip.work_days || 0) || 0,
          work_hours: parseFloat(payslip.work_hours || 0) || 0,
          absence_days: 0, // Not available in clc_payslips
        },
        balances,
        additional_data: additionalData,
        permissions: {
          can_edit: canEdit,
          can_download_pdf: canDownloadPDF,
        },
      };
      
      this.logger.log(`[getPayslip] Returning result with additional_data: ${!!result.additional_data}`);
      if (result.additional_data && (result.additional_data as any).yearly_accumulated_info) {
        this.logger.log(`[getPayslip] Result has yearly_accumulated_info with ${Object.keys((result.additional_data as any).yearly_accumulated_info).length} keys`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to get payslip ${payslipId}:`, error);
      throw error;
    }
  }

  async getLatestPayslipForEmployee(
    employeeId: string,
    tenantId: string,
    tenantCode: string,
    userId: string,
    userRole: string,
    periodId?: string,
  ): Promise<any | null> {
    // Security check: EMPLOYEE can only view their own payslips
    if (userRole === 'EMPLOYEE' && employeeId !== userId) {
      throw new ForbiddenException('Access denied: You can only view your own payslips');
    }

    const pool = await this.getTenantPool(tenantCode);

    try {
      // Check what columns exist in clc_payslips
      const columnsCheck = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'clc_payslips'
            AND TABLE_SCHEMA = SCHEMA_NAME()
        `);
      
      const availableColumns = columnsCheck.recordset.map((r: any) => r.COLUMN_NAME);
      
      // Determine date column for ordering
      let dateColumn = 'period_id';
      if (availableColumns.includes('issue_date')) {
        dateColumn = 'issue_date';
      } else if (availableColumns.includes('generation_date')) {
        dateColumn = 'generation_date';
      } else if (availableColumns.includes('created_date')) {
        dateColumn = 'created_date';
      } else if (availableColumns.includes('calc_date')) {
        dateColumn = 'calc_date';
      }

      // Build SELECT fields
      const selectFields = [
        'period_id',
        'employee_id',
      ];
      
      // Get the latest payslip for this employee
      // If periodId is provided, filter by it as well
      let whereClause = availableColumns.includes('client_id')
        ? 'LTRIM(RTRIM(employee_id)) = LTRIM(RTRIM(@employeeId)) AND LTRIM(RTRIM(client_id)) = LTRIM(RTRIM(@clientId))'
        : 'LTRIM(RTRIM(employee_id)) = LTRIM(RTRIM(@employeeId))';
      
      if (periodId) {
        whereClause += ' AND LTRIM(RTRIM(period_id)) = LTRIM(RTRIM(@periodId))';
      }

      const request = pool.request()
        .input('employeeId', sql.NVarChar, employeeId.trim());
      
      if (availableColumns.includes('client_id')) {
        request.input('clientId', sql.NVarChar, tenantCode.trim());
      }
      
      if (periodId) {
        request.input('periodId', sql.NVarChar, periodId.trim());
      }

      const result = await request.query(`
        SELECT TOP 1 period_id + '-' + employee_id as id, period_id, employee_id
        FROM clc_payslips
        WHERE ${whereClause}
        ORDER BY ${dateColumn} DESC, period_id DESC
      `);

      if (result.recordset.length === 0) {
        return null;
      }

      const latestPayslip = result.recordset[0];
      const payslipId = latestPayslip.id;

      // Use existing getPayslip method to get full payslip data
      return await this.getPayslip(payslipId, tenantId, tenantCode, userId, userRole);
    } catch (error) {
      this.logger.error(`Failed to get latest payslip for employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Get additional payslip data from clc_payslips and related tables
   */
  private async getAdditionalPayslipData(
    pool: sql.ConnectionPool,
    payslip: any,
    employeeId: string,
    tenantCode: string,
  ): Promise<any> {
    this.logger.log(`[getAdditionalPayslipData] ========== START getAdditionalPayslipData ==========`);
    this.logger.log(`[getAdditionalPayslipData] Called with employeeId: ${employeeId}, period: ${payslip.period_id}, tenant: ${tenantCode}`);
    
    // Initialize result object early so we can return partial data even if there are errors
    const generalInfo: any = {};
    const monthlyTaxInfo: any = {};
    const yearlyInfo: any = {};
    
    try {
      // Check available columns in clc_payslips
      const payslipColsResult = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'clc_payslips'
            AND TABLE_SCHEMA = SCHEMA_NAME()
        `);
      const payslipCols = payslipColsResult.recordset.map((r: any) => r.COLUMN_NAME);
      
      // Log available columns for debugging
      this.logger.log(`[getAdditionalPayslipData] Available columns in clc_payslips: ${payslipCols.length} columns`);
      this.logger.log(`[getAdditionalPayslipData] Payslip object keys: ${Object.keys(payslip).join(', ')}`);
      
      // Re-fetch payslip with ALL additional columns if they're not in the payslip object
      // This ensures we have all the data we need
      const additionalColumns = [
        'department_number', 'employee_address', 'employee_national_id',
        'tariff_monthly', 'tariff_daily', 'tariff_hourly',
        'start_of_work', 'seniority_years', 'seniority_months',
        'job_pct', 'partial_period_pct', 'tax_credit_points', 'tax_pct_level',
        'ytd_months_of_work', 'total_months_worked',
        'severance_monthly', 'severance_gross_monthly',
        'kpg_employer_monthly', 'kpg_gross_monthly',
        'khs_employer_monthly', 'khs_gross_monthly',
        'city_tax_credit_month', 'seif_47_exempt_month', 'shovi_monthly',
        'ytd_gross_payments', 'ytd_shovi', 'ytd_gross_for_tax', 'ytd_tax',
        'ytd_bl_employee', 'ytd_bl_employer',
        'ytd_health_employee', 'ytd_health_employer',
        'ytd_35_tax_exempt', 'ytd_khs_employer', 'ytd_khs_employee',
        'ytd_47_tax_deduction', 'ytd_pension_employer', 'ytd_pension_employee',
        'ytd_severance_employer',
        'ytd_credit_points_amount', 'ytd_city_tax_credit', 'ytd_total_tax_credit'
      ];
      
      // Check which additional columns are missing from payslip object
      const missingColumns = additionalColumns.filter(col => 
        payslipCols.includes(col) && payslip[col] === undefined
      );
      
      // If there are missing columns, fetch them directly from the database
      if (missingColumns.length > 0) {
        this.logger.log(`[getAdditionalPayslipData] Missing columns in payslip object: ${missingColumns.join(', ')}`);
        this.logger.log(`[getAdditionalPayslipData] Re-fetching missing columns from database...`);
        
        const missingSelectFields = missingColumns.map(col => col).join(', ');
        const refetchResult = await pool
          .request()
          .input('periodId', sql.NVarChar, payslip.period_id)
          .input('employeeId', sql.NVarChar, employeeId)
          .input('clientId', sql.NVarChar, tenantCode)
          .query(`
            SELECT ${missingSelectFields}
            FROM clc_payslips
            WHERE period_id = @periodId 
              AND employee_id = @employeeId 
              AND client_id = @clientId
          `);
        
        if (refetchResult.recordset.length > 0) {
          // Merge missing columns into payslip object
          const missingData = refetchResult.recordset[0];
          for (const col of missingColumns) {
            if (missingData[col] !== undefined) {
              payslip[col] = missingData[col];
            }
          }
          this.logger.log(`[getAdditionalPayslipData] Successfully fetched ${missingColumns.length} missing columns`);
        }
      }

      // Check available columns in related tables
      const [deptColsResult, contractColsResult, clientColsResult, bankDetailColsResult] = await Promise.all([
        pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'departments' AND TABLE_SCHEMA = SCHEMA_NAME()`).catch(() => ({ recordset: [] })),
        pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'employees_contracts' AND TABLE_SCHEMA = SCHEMA_NAME()`).catch(() => ({ recordset: [] })),
        pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clients' AND TABLE_SCHEMA = SCHEMA_NAME()`).catch(() => ({ recordset: [] })),
        pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'employees_bank_details' AND TABLE_SCHEMA = SCHEMA_NAME()`).catch(() => ({ recordset: [] })),
      ]);

      const deptCols = deptColsResult.recordset.map((r: any) => r.COLUMN_NAME);
      const contractCols = contractColsResult.recordset.map((r: any) => r.COLUMN_NAME);
      const clientCols = clientColsResult.recordset.map((r: any) => r.COLUMN_NAME);
      const bankDetailCols = bankDetailColsResult.recordset.map((r: any) => r.COLUMN_NAME);

      // Build General Information (generalInfo already initialized above)
      
      // Helper function to safely get value from payslip
      const getPayslipValue = (columnName: string, parseAsFloat: boolean = false): any => {
        if (!payslipCols.includes(columnName)) {
          return null;
        }
        const value = payslip[columnName];
        if (value === null || value === undefined || value === '') {
          return null;
        }
        return parseAsFloat ? parseFloat(value) : value;
      };
      
      if (payslipCols.includes('department_number')) {
        generalInfo.department_number = getPayslipValue('department_number');
        this.logger.log(`[getAdditionalPayslipData] department_number value: ${generalInfo.department_number}, type: ${typeof generalInfo.department_number}`);
        
        // Get department name
        if (deptCols.length > 0 && generalInfo.department_number !== null && generalInfo.department_number !== undefined && generalInfo.department_number !== '') {
          try {
            const deptHasClientId = deptCols.includes('client_id');
            // Convert to string and handle edge cases
            let deptNumStr: string;
            if (typeof generalInfo.department_number === 'number') {
              deptNumStr = generalInfo.department_number.toString();
            } else if (typeof generalInfo.department_number === 'string') {
              deptNumStr = generalInfo.department_number.trim();
            } else {
              deptNumStr = String(generalInfo.department_number || '').trim();
            }
            
            // Skip if empty string after conversion
            if (!deptNumStr || deptNumStr === '') {
              this.logger.warn(`[getAdditionalPayslipData] department_number is empty after conversion, skipping department query`);
            } else {
              this.logger.log(`[getAdditionalPayslipData] Querying department with deptNumStr: "${deptNumStr}"`);
              const whereClause = deptHasClientId 
                ? 'department_number = @deptNum AND client_id = @clientId'
                : 'department_number = @deptNum';
              
              const deptRequest = pool.request().input('deptNum', sql.NVarChar(255), deptNumStr);
              if (deptHasClientId) {
                deptRequest.input('clientId', sql.NVarChar(255), tenantCode);
              }
              
              const deptResult = await deptRequest.query(`
                SELECT TOP 1 ${deptCols.includes('department_name') ? 'department_name' : "'' as department_name"}
                FROM departments
                WHERE ${whereClause}
              `);
              
              if (deptResult.recordset.length > 0) {
                generalInfo.department_name = deptResult.recordset[0].department_name || null;
                this.logger.log(`[getAdditionalPayslipData] Found department_name: ${generalInfo.department_name}`);
              }
            }
          } catch (error: any) {
            this.logger.warn(`[getAdditionalPayslipData] Error fetching department name: ${error.message}`, error.stack);
            // Continue without department name
          }
        }
      }

      // Employee address and national ID from payslip
      generalInfo.employee_address = getPayslipValue('employee_address');
      generalInfo.employee_national_id = getPayslipValue('employee_national_id');

      // Tariff fields
      generalInfo.tariff_monthly = getPayslipValue('tariff_monthly', true);
      generalInfo.tariff_daily = getPayslipValue('tariff_daily', true);
      generalInfo.tariff_hourly = getPayslipValue('tariff_hourly', true);

      // Standard hours per month from employees_contracts
      if (contractCols.length > 0) {
        try {
          const contractHasClientId = contractCols.includes('client_id');
          const contractWhereClause = contractHasClientId 
            ? 'employee_id = @empId AND client_id = @clientId'
            : 'employee_id = @empId';
          const isActiveClause = contractCols.includes('is_active') ? 'AND is_active = 1' : '';
          
          const contractRequest = pool.request().input('empId', sql.NVarChar, String(employeeId));
          if (contractHasClientId) {
            contractRequest.input('clientId', sql.NVarChar, tenantCode);
          }
          
          const contractResult = await contractRequest.query(`
            SELECT TOP 1 ${contractCols.includes('standard_hours_per_month') ? 'standard_hours_per_month' : 'NULL as standard_hours_per_month'}
            FROM employees_contracts
            WHERE ${contractWhereClause} ${isActiveClause}
          `);
          
          if (contractResult.recordset.length > 0 && contractResult.recordset[0].standard_hours_per_month) {
            generalInfo.standard_hours_per_month = parseFloat(contractResult.recordset[0].standard_hours_per_month) || null;
          }
        } catch (error: any) {
          this.logger.warn(`[getAdditionalPayslipData] Error fetching standard hours: ${error.message}`);
          // Continue without standard hours
        }
      }

      // Start of work, seniority, job_pct, partial_period_pct from payslip
      const startOfWork = getPayslipValue('start_of_work');
      if (startOfWork) {
        generalInfo.start_of_work = startOfWork instanceof Date ? startOfWork.toISOString() : (typeof startOfWork === 'string' ? startOfWork : null);
      }
      generalInfo.seniority_years = getPayslipValue('seniority_years', true);
      generalInfo.seniority_months = getPayslipValue('seniority_months', true);
      generalInfo.job_pct = getPayslipValue('job_pct', true);
      generalInfo.partial_period_pct = getPayslipValue('partial_period_pct', true);
      generalInfo.tax_credit_points = getPayslipValue('tax_credit_points', true);
      generalInfo.tax_pct_level = getPayslipValue('tax_pct_level', true);
      generalInfo.ytd_months_of_work = getPayslipValue('ytd_months_of_work', true) || getPayslipValue('total_months_worked', true);

      // Client info (employer tax file number, employer national insurance number)
      if (clientCols.length > 0) {
        try {
          const clientHasClientId = clientCols.includes('client_id');
          const clientWhereClause = clientHasClientId 
            ? 'client_id = @clientId'
            : '1=1';
          
          const clientRequest = pool.request();
          if (clientHasClientId) {
            clientRequest.input('clientId', sql.NVarChar, tenantCode);
          }
          
          const clientResult = await clientRequest.query(`
            SELECT TOP 1 
              ${clientCols.includes('tax_file_number') ? 'tax_file_number' : 'NULL as tax_file_number'},
              ${clientCols.includes('national_s_employer_number') ? 'national_s_employer_number' : 'NULL as national_s_employer_number'}
            FROM clients
            WHERE ${clientWhereClause}
          `);
          
          if (clientResult.recordset.length > 0) {
            if (clientResult.recordset[0].tax_file_number) {
              generalInfo.employer_tax_file_number = clientResult.recordset[0].tax_file_number || null;
            }
            if (clientResult.recordset[0].national_s_employer_number) {
              generalInfo.employer_national_insurance_number = clientResult.recordset[0].national_s_employer_number || null;
            }
          }
        } catch (error: any) {
          this.logger.warn(`[getAdditionalPayslipData] Error fetching client info: ${error.message}`);
          // Continue without client info
        }
      }

      // Bank details
      if (bankDetailCols.length > 0) {
        try {
          const bankDetailHasClientId = bankDetailCols.includes('client_id');
          const bankDetailWhereClause = bankDetailHasClientId 
            ? 'employee_id = @empId AND client_id = @clientId'
            : 'employee_id = @empId';
          const isPrimaryClause = bankDetailCols.includes('is_primary') ? 'AND is_primary = 1' : '';
          
          const bankRequest = pool.request().input('empId', sql.NVarChar, String(employeeId));
          if (bankDetailHasClientId) {
            bankRequest.input('clientId', sql.NVarChar, tenantCode);
          }
          
          const bankResult = await bankRequest.query(`
            SELECT TOP 1
              ${bankDetailCols.includes('bank_code') ? 'bank_code' : 'NULL as bank_code'},
              ${bankDetailCols.includes('branch_code') ? 'branch_code' : 'NULL as branch_code'},
              ${bankDetailCols.includes('account_number') ? 'account_number' : 'NULL as account_number'}
            FROM employees_bank_details
            WHERE ${bankDetailWhereClause} ${isPrimaryClause}
          `);
          
          if (bankResult.recordset.length > 0) {
            if (bankResult.recordset[0].bank_code) {
              generalInfo.bank_code = bankResult.recordset[0].bank_code || null;
            }
            if (bankResult.recordset[0].branch_code) {
              generalInfo.branch_code = bankResult.recordset[0].branch_code || null;
            }
            if (bankResult.recordset[0].account_number) {
              generalInfo.account_number = bankResult.recordset[0].account_number || null;
            }
          }
        } catch (error: any) {
          this.logger.warn(`[getAdditionalPayslipData] Error fetching bank details: ${error.message}`);
          // Continue without bank details
        }
      }

      // Build Monthly Tax Information (monthlyTaxInfo already initialized above)
      monthlyTaxInfo.tax_credit_points = getPayslipValue('tax_credit_points', true);
      monthlyTaxInfo.tax_pct_level = getPayslipValue('tax_pct_level', true);
      monthlyTaxInfo.severance_monthly = getPayslipValue('severance_monthly', true);
      monthlyTaxInfo.severance_gross_monthly = getPayslipValue('severance_gross_monthly', true);
      monthlyTaxInfo.kpg_employer_monthly = getPayslipValue('kpg_employer_monthly', true);
      monthlyTaxInfo.kpg_gross_monthly = getPayslipValue('kpg_gross_monthly', true);
      monthlyTaxInfo.khs_employer_monthly = getPayslipValue('khs_employer_monthly', true);
      monthlyTaxInfo.khs_gross_monthly = getPayslipValue('khs_gross_monthly', true);
      monthlyTaxInfo.city_tax_credit_month = getPayslipValue('city_tax_credit_month', true);
      monthlyTaxInfo.seif_47_exempt_month = getPayslipValue('seif_47_exempt_month', true);
      monthlyTaxInfo.shovi_monthly = getPayslipValue('shovi_monthly', true);

      // Build Yearly/Accumulated Information (yearlyInfo already initialized above)
      yearlyInfo.ytd_gross_payments = getPayslipValue('ytd_gross_payments', true);
      yearlyInfo.ytd_shovi = getPayslipValue('ytd_shovi', true);
      yearlyInfo.ytd_gross_for_tax = getPayslipValue('ytd_gross_for_tax', true);
      yearlyInfo.ytd_tax = getPayslipValue('ytd_tax', true);
      yearlyInfo.ytd_bl_employee = getPayslipValue('ytd_bl_employee', true);
      yearlyInfo.ytd_bl_employer = getPayslipValue('ytd_bl_employer', true);
      yearlyInfo.ytd_health_employee = getPayslipValue('ytd_health_employee', true);
      yearlyInfo.ytd_health_employer = getPayslipValue('ytd_health_employer', true);
      yearlyInfo.ytd_35_tax_exempt = getPayslipValue('ytd_35_tax_exempt', true);
      yearlyInfo.ytd_khs_employer = getPayslipValue('ytd_khs_employer', true);
      yearlyInfo.ytd_khs_employee = getPayslipValue('ytd_khs_employee', true);
      yearlyInfo.ytd_47_tax_deduction = getPayslipValue('ytd_47_tax_deduction', true);
      yearlyInfo.ytd_pension_employer = getPayslipValue('ytd_pension_employer', true);
      yearlyInfo.ytd_pension_employee = getPayslipValue('ytd_pension_employee', true);
      yearlyInfo.ytd_severance_employer = getPayslipValue('ytd_severance_employer', true);
      // Additional YTD fields that might exist with different names
      yearlyInfo.ytd_credit_points_amount = getPayslipValue('ytd_credit_points_amount', true);
      yearlyInfo.ytd_city_tax_credit = getPayslipValue('ytd_city_tax_credit', true);
      yearlyInfo.ytd_total_tax_credit = getPayslipValue('ytd_total_tax_credit', true);

      // Keep all values, including null, so the frontend can display all fields
      // Only remove completely undefined values
      const cleanGeneralInfo = Object.fromEntries(
        Object.entries(generalInfo).filter(([_, v]) => v !== undefined)
      );
      const cleanMonthlyTaxInfo = Object.fromEntries(
        Object.entries(monthlyTaxInfo).filter(([_, v]) => v !== undefined)
      );
      const cleanYearlyInfo = Object.fromEntries(
        Object.entries(yearlyInfo).filter(([_, v]) => v !== undefined)
      );

      const result = {
        general_info: Object.keys(cleanGeneralInfo).length > 0 ? cleanGeneralInfo : undefined,
        monthly_tax_info: Object.keys(cleanMonthlyTaxInfo).length > 0 ? cleanMonthlyTaxInfo : undefined,
        yearly_accumulated_info: Object.keys(cleanYearlyInfo).length > 0 ? cleanYearlyInfo : undefined,
      };
      
      this.logger.log(`[getAdditionalPayslipData] Returning additional data:`, JSON.stringify(result, null, 2));
      this.logger.log(`[getAdditionalPayslipData] Yearly info keys: ${Object.keys(cleanYearlyInfo).join(', ')}`);
      this.logger.log(`[getAdditionalPayslipData] Yearly info values:`, JSON.stringify(cleanYearlyInfo, null, 2));
      
      return result;
    } catch (error: any) {
      this.logger.warn(`[getAdditionalPayslipData] Error fetching additional data: ${error.message}`, error.stack);
      // Return partial data that was collected before the error
      // Clean the data that was collected
      const cleanGeneralInfo = Object.fromEntries(
        Object.entries(generalInfo).filter(([_, v]) => v !== undefined)
      );
      const cleanMonthlyTaxInfo = Object.fromEntries(
        Object.entries(monthlyTaxInfo).filter(([_, v]) => v !== undefined)
      );
      const cleanYearlyInfo = Object.fromEntries(
        Object.entries(yearlyInfo).filter(([_, v]) => v !== undefined)
      );
      
      const partialResult = {
        general_info: Object.keys(cleanGeneralInfo).length > 0 ? cleanGeneralInfo : undefined,
        monthly_tax_info: Object.keys(cleanMonthlyTaxInfo).length > 0 ? cleanMonthlyTaxInfo : undefined,
        yearly_accumulated_info: Object.keys(cleanYearlyInfo).length > 0 ? cleanYearlyInfo : undefined,
      };
      
      this.logger.log(`[getAdditionalPayslipData] Returning partial data after error:`, JSON.stringify(partialResult, null, 2));
      return partialResult;
    }
  }

  private async getEmployeeDataFromPayslip(
    pool: sql.ConnectionPool,
    employeeId: string,
    tenantCode: string,
    periodId?: string,
  ): Promise<any> {
    // Get job_pct from clc_payslips if periodId is provided
    let jobPctFromPayslip: number | null = null;
    if (periodId) {
      try {
        const payslipJobPctResult = await pool
          .request()
          .input('employeeId', sql.NVarChar, employeeId)
          .input('clientId', sql.NVarChar, tenantCode)
          .input('periodId', sql.NVarChar, periodId)
          .query(`
            SELECT TOP 1 job_pct 
            FROM clc_payslips 
            WHERE employee_id = @employeeId 
              AND client_id = @clientId 
              AND period_id = @periodId
          `);
        if (payslipJobPctResult.recordset.length > 0 && payslipJobPctResult.recordset[0].job_pct !== null) {
          jobPctFromPayslip = parseFloat(payslipJobPctResult.recordset[0].job_pct); // job_pct is already in percentage format (e.g., 80.00 = 80%)
        }
      } catch (error) {
        // If clc_payslips doesn't have job_pct or query fails, fall back to contract
        this.logger.warn(`[getEmployeeDataFromPayslip] Could not get job_pct from clc_payslips, will use contract value`);
      }
    }
    
    // Check which columns exist in each table
    const [employeesColumns, contractsColumns, departmentsColumns, bankDetailsColumns, banksColumns] = await Promise.all([
      pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'employees' AND TABLE_SCHEMA = SCHEMA_NAME()`),
      pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'employees_contracts' AND TABLE_SCHEMA = SCHEMA_NAME()`),
      pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'departments' AND TABLE_SCHEMA = SCHEMA_NAME()`),
      pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'employees_bank_details' AND TABLE_SCHEMA = SCHEMA_NAME()`),
      pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'banks' AND TABLE_SCHEMA = SCHEMA_NAME()`).catch(() => ({ recordset: [] })), // banks might not exist
    ]);

    const empCols = employeesColumns.recordset.map((r: any) => r.COLUMN_NAME);
    const contractCols = contractsColumns.recordset.map((r: any) => r.COLUMN_NAME);
    const deptCols = departmentsColumns.recordset.map((r: any) => r.COLUMN_NAME);
    const bankDetailCols = bankDetailsColumns.recordset.map((r: any) => r.COLUMN_NAME);
    const bankCols = banksColumns.recordset.map((r: any) => r.COLUMN_NAME);

    // Build SELECT fields dynamically
    const selectFields: string[] = [
      'e.employee_id',
      empCols.includes('first_name') ? 'e.first_name' : "'' as first_name",
      empCols.includes('last_name') ? 'e.last_name' : "'' as last_name",
      empCols.includes('tz_id') ? 'e.tz_id as national_id' : "'' as national_id",
      empCols.includes('address_line1') ? 'e.address_line1' : "'' as address_line1",
      empCols.includes('address_line2') ? 'e.address_line2' : "'' as address_line2",
      empCols.includes('city_code') ? 'e.city_code' : "'' as city_code",
      empCols.includes('zip_code') ? 'e.zip_code' : "'' as zip_code",
      empCols.includes('hire_date') ? 'e.hire_date as employment_start_date' : 'NULL as employment_start_date',
      empCols.includes('hire_date') ? 'DATEDIFF(YEAR, e.hire_date, GETDATE()) as seniority_years' : '0 as seniority_years',
      contractCols.includes('job_percentage') || contractCols.includes('employment_percent') 
        ? `c.${contractCols.includes('job_percentage') ? 'job_percentage' : 'employment_percent'} as job_percentage`
        : '100 as job_percentage',
      deptCols.includes('department_name') ? 'd.department_name as department' : "'' as department",
      empCols.includes('site_number') ? 'e.site_number as work_center' : "'' as work_center",
      empCols.includes('job_title') ? 'e.job_title as position' : empCols.includes('position') ? 'e.position' : "'' as position",
      empCols.includes('grade') ? 'e.grade' : "'' as grade",
      empCols.includes('marital_status') ? 'e.marital_status' : "'' as marital_status",
    ];

    // Add bank fields
    if (bankDetailCols.length > 0) {
      selectFields.push(
        bankCols.includes('bank_name') ? 'b.bank_name' : "'' as bank_name",
        bankDetailCols.includes('branch_code') ? 'bd.branch_code as branch_number' : "'' as branch_number",
        bankDetailCols.includes('account_number') ? 'bd.account_number' : "'' as account_number"
      );
    } else {
      selectFields.push("'' as bank_name", "'' as branch_number", "'' as account_number");
    }

    // Build JOINs dynamically
    let joins = '';
    
    // Check if client_id exists in each table
    const contractHasClientId = contractCols.includes('client_id');
    const deptHasClientId = deptCols.includes('client_id');
    const bankDetailHasClientId = bankDetailCols.includes('client_id');
    const bankHasClientId = bankCols.includes('client_id');
    const empHasClientId = empCols.includes('client_id');
    
    // employees_contracts join
    if (contractCols.length > 0) {
      const isActiveCol = contractCols.includes('is_active') ? 'AND c.is_active = 1' : '';
      const clientIdJoin = contractHasClientId && empHasClientId ? 'AND e.client_id = c.client_id' : '';
      joins += ` LEFT JOIN employees_contracts c ON e.employee_id = c.employee_id ${clientIdJoin} ${isActiveCol}`;
    }
    
    // departments join
    if (deptCols.length > 0 && empCols.includes('department_number')) {
      const clientIdJoin = deptHasClientId && empHasClientId ? 'AND e.client_id = d.client_id' : '';
      joins += ` LEFT JOIN departments d ON e.department_number = d.department_number ${clientIdJoin}`;
    } else {
      // Dummy join if departments table doesn't exist
      joins += ` LEFT JOIN (SELECT NULL as department_name) d ON 1=0`;
    }
    
    // bank details join
    if (bankDetailCols.length > 0) {
      const isPrimaryCol = bankDetailCols.includes('is_primary') ? 'AND bd.is_primary = 1' : '';
      const clientIdJoin = bankDetailHasClientId && empHasClientId ? 'AND e.client_id = bd.client_id' : '';
      joins += ` LEFT JOIN employees_bank_details bd ON e.employee_id = bd.employee_id ${clientIdJoin} ${isPrimaryCol}`;
      
      // banks join (if banks table exists and bank_code exists in both tables)
      const bankDetailHasBankCode = bankDetailCols.includes('bank_code');
      const bankHasBankCode = bankCols.includes('bank_code');
      
      if (bankCols.length > 0 && bankDetailHasBankCode && bankHasBankCode) {
        const bankClientIdJoin = bankHasClientId && empHasClientId ? 'AND e.client_id = b.client_id' : '';
        joins += ` LEFT JOIN banks b ON bd.bank_code = b.bank_code ${bankClientIdJoin}`;
      } else {
        joins += ` LEFT JOIN (SELECT NULL as bank_name) b ON 1=0`; // Dummy join to avoid syntax error
      }
    } else {
      joins += ` LEFT JOIN (SELECT NULL as bank_name) b ON 1=0`;
      joins += ` LEFT JOIN (SELECT NULL as branch_code, NULL as account_number) bd ON 1=0`;
    }

    // Build WHERE clause dynamically
    const whereClause = empHasClientId 
      ? `WHERE e.employee_id = @employeeId AND e.client_id = @clientId`
      : `WHERE e.employee_id = @employeeId`;

    const query = `
      SELECT ${selectFields.join(', ')}
      FROM employees e
      ${joins}
      ${whereClause}
    `;

    const result = await pool
      .request()
      .input('employeeId', sql.NVarChar, employeeId)
      .input('clientId', sql.NVarChar, tenantCode)
      .query(query);

    if (result.recordset.length === 0) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }

    const row = result.recordset[0];
    const address = [
      row.address_line1 || '',
      row.address_line2 || '',
      row.city_code || '',
      row.zip_code || ''
    ]
      .filter(Boolean)
      .join(', ');

    return {
      full_name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.employee_id,
      employee_id: row.employee_id,
      national_id: row.national_id || '',
      address: address || '',
      employment_start_date: row.employment_start_date?.toISOString() || '',
      seniority_years: row.seniority_years || 0,
      job_percentage: jobPctFromPayslip !== null ? jobPctFromPayslip : (row.job_percentage || 100),
      department: row.department || '',
      work_center: row.work_center || '',
      position: row.position || '',
      grade: row.grade || '',
      marital_status: row.marital_status || '',
      bank_name: row.bank_name || '',
      branch_number: row.branch_number || '',
      account_number: row.account_number || '',
    };
  }

  private async getPayslipLines(
    pool: sql.ConnectionPool,
    payslipId: string,
    itemTypeFilter: string,
  ): Promise<any[]> {
    // Parse payslipId to get period_id and employee_id
    let periodId: string;
    let employeeId: string | null = null;
    
    if (payslipId.includes('-')) {
      const parts = payslipId.split('-');
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        if (lastPart.length > 2 || isNaN(parseInt(lastPart))) {
          employeeId = lastPart;
          periodId = parts.slice(0, -1).join('-');
        } else {
          periodId = payslipId;
        }
      } else {
        periodId = payslipId;
      }
    } else {
      periodId = payslipId;
    }

    if (!employeeId) {
      // If no employee_id in payslipId, we can't query - return empty
      return [];
    }

    // Check available columns in clc_payslip_lines
    const payslipLinesColsResult = await pool
      .request()
      .query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'clc_payslip_lines'
          AND TABLE_SCHEMA = SCHEMA_NAME()
      `);
    const payslipLinesCols = payslipLinesColsResult.recordset.map((r: any) => r.COLUMN_NAME);

    // Build SELECT fields dynamically
    // Use item_name if available, otherwise use item_description
    const hasItemName = payslipLinesCols.includes('item_name');
    const hasItemDescription = payslipLinesCols.includes('item_description');
    
    const selectFields = [
      payslipLinesCols.includes('item_code') ? 'item_code' : "'' as item_code",
      hasItemName ? 'item_name as item_description' : 
        hasItemDescription ? 'item_description' : "'' as item_description",
      payslipLinesCols.includes('quantity') ? 'quantity' : '0 as quantity',
      payslipLinesCols.includes('rate') ? 'rate' : '0 as rate',
      payslipLinesCols.includes('taxable_value') ? 'taxable_value' : '0 as taxable_value',
      payslipLinesCols.includes('amount') ? 'amount' : '0 as amount',
    ];
    if (payslipLinesCols.includes('explanation')) {
      selectFields.push('explanation');
    } else {
      selectFields.push("'' as explanation");
    }

    const query = itemTypeFilter.includes('IN (')
      ? `SELECT ${selectFields.join(', ')} FROM clc_payslip_lines WHERE period_id = @periodId AND employee_id = @employeeId AND item_type ${itemTypeFilter}`
      : `SELECT ${selectFields.join(', ')} FROM clc_payslip_lines WHERE period_id = @periodId AND employee_id = @employeeId AND item_type = @itemType`;

    const request = pool.request()
      .input('periodId', sql.NVarChar, periodId)
      .input('employeeId', sql.NVarChar, employeeId);
    
    if (!itemTypeFilter.includes('IN (')) {
      request.input('itemType', sql.NVarChar, itemTypeFilter);
    }

    const result = await request.query(query);

    return result.recordset.map((row: any) => ({
      code: row.item_code || '',
      description: row.item_description || '',
      quantity: parseFloat(row.quantity) || 0,
      rate: parseFloat(row.rate) || 0,
      taxable_value: parseFloat(row.taxable_value) || 0,
      amount: parseFloat(row.amount) || 0,
      explanation: payslipLinesCols.includes('explanation') ? (row.explanation || undefined) : undefined,
    }));
  }

  private async getLeaveBalances(
    pool: sql.ConnectionPool,
    employeeId: string,
    periodId: string,
    tenantCode: string,
  ): Promise<any> {
    // Table name is clc_leave_balances (with 's')
    const tableName = 'clc_leave_balances';

    // Check available columns in the table
    const leaveBalancesColsResult = await pool
      .request()
      .query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}'
          AND TABLE_SCHEMA = SCHEMA_NAME()
      `);
    const leaveBalancesCols = leaveBalancesColsResult.recordset.map((r: any) => r.COLUMN_NAME);

    this.logger.log(`[getLeaveBalances] Using table: ${tableName}, available columns: ${leaveBalancesCols.join(', ')}`);

    // Build SELECT fields dynamically based on actual column names
    // Support both old format (previous_balance, accrued, used, new_balance) 
    // and new format (before_vacation_balance_days, monthly_vacation_added, etc.)
    
    // Check if table has separate columns for vacation and sick (clc_leave_balance format)
    const hasSeparateColumns = leaveBalancesCols.includes('before_vacation_balance_days') 
      || leaveBalancesCols.includes('before_sick_balance_days');
    
    // For vacation - use new format if available, otherwise fall back to old format
    const vacationBefore = leaveBalancesCols.includes('before_vacation_balance_days') 
      ? 'before_vacation_balance_days' 
      : (leaveBalancesCols.includes('previous_balance') ? 'previous_balance' : '0');
    const vacationAdded = leaveBalancesCols.includes('monthly_vacation_added') 
      ? 'monthly_vacation_added' 
      : (leaveBalancesCols.includes('accrued') ? 'accrued' : '0');
    const vacationUsed = leaveBalancesCols.includes('monthly_vacation_used') 
      ? 'monthly_vacation_used' 
      : (leaveBalancesCols.includes('used') ? 'used' : '0');
    const vacationFinal = leaveBalancesCols.includes('final_vacation_balance_days') 
      ? 'final_vacation_balance_days' 
      : (leaveBalancesCols.includes('new_balance') ? 'new_balance' : '0');

    // For sick - use new format if available, otherwise fall back to old format
    const sickBefore = leaveBalancesCols.includes('before_sick_balance_days') 
      ? 'before_sick_balance_days' 
      : (leaveBalancesCols.includes('previous_balance') ? 'previous_balance' : '0');
    const sickAdded = leaveBalancesCols.includes('monthly_sick_added') 
      ? 'monthly_sick_added' 
      : (leaveBalancesCols.includes('accrued') ? 'accrued' : '0');
    const sickUsed = leaveBalancesCols.includes('monthly_sick_used') 
      ? 'monthly_sick_used' 
      : (leaveBalancesCols.includes('used') ? 'used' : '0');
    const sickFinal = leaveBalancesCols.includes('final_sick_balance_days') 
      ? 'final_sick_balance_days' 
      : (leaveBalancesCols.includes('new_balance') ? 'new_balance' : '0');
    
    let query: string;
    let request = pool.request()
      .input('employeeId', sql.NVarChar, employeeId)
      .input('periodId', sql.NVarChar, periodId)
      .input('clientId', sql.NVarChar, tenantCode);

    if (hasSeparateColumns) {
      // Table has separate columns for vacation and sick (clc_leave_balance format)
      query = `
        SELECT 
          ${vacationBefore} as vacation_before,
          ${vacationAdded} as vacation_added,
          ${vacationUsed} as vacation_used,
          ${vacationFinal} as vacation_final,
          ${sickBefore} as sick_before,
          ${sickAdded} as sick_added,
          ${sickUsed} as sick_used,
          ${sickFinal} as sick_final
        FROM ${tableName}
        WHERE employee_id = @employeeId 
          AND period_id = @periodId 
          AND client_id = @clientId
      `;
    } else {
      // Table uses leave_type to distinguish (clc_leave_balances format)
      const selectFields = [
        leaveBalancesCols.includes('leave_type') ? 'leave_type' : "'' as leave_type",
        leaveBalancesCols.includes('previous_balance') ? 'previous_balance' : '0 as previous_balance',
        leaveBalancesCols.includes('accrued') ? 'accrued' : '0 as accrued',
        leaveBalancesCols.includes('used') ? 'used' : '0 as used',
      ];
      
      if (leaveBalancesCols.includes('new_balance')) {
        selectFields.push('new_balance');
      } else if (leaveBalancesCols.includes('balance_after')) {
        selectFields.push('balance_after as new_balance');
      } else {
        selectFields.push('0 as new_balance');
      }

      query = `
        SELECT ${selectFields.join(', ')}
        FROM ${tableName}
        WHERE employee_id = @employeeId 
          AND period_id = @periodId 
          AND client_id = @clientId
      `;
    }

    this.logger.log(`[getLeaveBalances] Executing query: ${query.substring(0, 200)}...`);

    const result = await request.query(query);

    this.logger.log(`[getLeaveBalances] Query returned ${result.recordset.length} rows`);

    if (hasSeparateColumns) {
      // Single row with separate columns for vacation and sick (clc_leave_balance format)
      if (result.recordset.length > 0) {
        const row = result.recordset[0];
        this.logger.log(`[getLeaveBalances] Found row with separate columns:`, {
          vacation_before: row.vacation_before,
          vacation_added: row.vacation_added,
          vacation_used: row.vacation_used,
          vacation_final: row.vacation_final,
          sick_before: row.sick_before,
          sick_added: row.sick_added,
          sick_used: row.sick_used,
          sick_final: row.sick_final,
        });
        
        return {
          vacation: {
            previous_balance: parseFloat(row.vacation_before) || 0,
            accrued: parseFloat(row.vacation_added) || 0,
            used: parseFloat(row.vacation_used) || 0,
            new_balance: parseFloat(row.vacation_final) || 0,
          },
          sick: {
            previous_balance: parseFloat(row.sick_before) || 0,
            accrued: parseFloat(row.sick_added) || 0,
            used: parseFloat(row.sick_used) || 0,
            new_balance: parseFloat(row.sick_final) || 0,
          },
        };
      } else {
        // No rows found - return zeros
        this.logger.warn(`[getLeaveBalances] No rows found for employee ${employeeId}, period ${periodId}`);
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
    } else {
      // Multiple rows with leave_type (clc_leave_balances format)
      const vacation = result.recordset.find((r: any) => r.leave_type === 'VACATION' || r.leave_type === 'חופשה') || {
        previous_balance: 0,
        accrued: 0,
        used: 0,
        new_balance: 0,
      };

      const sick = result.recordset.find((r: any) => r.leave_type === 'SICK' || r.leave_type === 'מחלה') || {
        previous_balance: 0,
        accrued: 0,
        used: 0,
        new_balance: 0,
      };

      this.logger.log(`[getLeaveBalances] Found rows with leave_type:`, {
        vacation: vacation,
        sick: sick,
      });

      return {
        vacation: {
          previous_balance: parseFloat(vacation.previous_balance) || 0,
          accrued: parseFloat(vacation.accrued) || 0,
          used: parseFloat(vacation.used) || 0,
          new_balance: parseFloat(vacation.new_balance) || 0,
        },
        sick: {
          previous_balance: parseFloat(sick.previous_balance) || 0,
          accrued: parseFloat(sick.accrued) || 0,
          used: parseFloat(sick.used) || 0,
          new_balance: parseFloat(sick.new_balance) || 0,
        },
      };
    }
  }

  private async getCompanyInfo(pool: sql.ConnectionPool, tenantCode: string): Promise<any> {
    // First, try to get tenant name from Control DB (same as shown in TopBar)
    try {
      // Get Control DB connection from environment
      const controlDbUrl = process.env.CONTROL_DB_URL;
      if (controlDbUrl) {
        const controlConfig = this.parseConnectionString(controlDbUrl);
        const controlPool = new sql.ConnectionPool(controlConfig);
        await controlPool.connect();
        
        try {
          const tenantResult = await controlPool
            .request()
            .input('tenantCode', sql.NVarChar, tenantCode)
            .query(`
              SELECT TOP 1 name
              FROM tenants
              WHERE code = @tenantCode AND is_active = 1
            `);
          
          if (tenantResult.recordset.length > 0) {
            const tenantName = tenantResult.recordset[0].name || '';
            this.logger.log(`[getCompanyInfo] Found tenant name from Control DB: "${tenantName}"`);
            await controlPool.close();
            return {
              name: tenantName,
              registration_number: '', // Registration number not available in tenants table
            };
          }
        } finally {
          await controlPool.close();
        }
      }
    } catch (error) {
      this.logger.warn(`[getCompanyInfo] Failed to get tenant name from Control DB: ${error.message}`);
    }

    // Fallback: Try to get company info from tenant DB companies table
    try {
      // Check if companies table exists
      const tableCheck = await pool
        .request()
        .query(`
          SELECT COUNT(*) as table_count
          FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_NAME = 'companies'
            AND TABLE_SCHEMA = SCHEMA_NAME()
        `);

      if (tableCheck.recordset[0].table_count === 0) {
        this.logger.warn(`[getCompanyInfo] Companies table does not exist for tenant: ${tenantCode}`);
        return {
          name: '',
          registration_number: '',
        };
      }

      // Check available columns
      const companyColsResult = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'companies'
            AND TABLE_SCHEMA = SCHEMA_NAME()
        `);
      const companyCols = companyColsResult.recordset.map((r: any) => r.COLUMN_NAME);

      // Try multiple possible column names for company name
      let nameField = "'' as name";
      if (companyCols.includes('company_name')) {
        nameField = 'company_name as name';
      } else if (companyCols.includes('name')) {
        nameField = 'name';
      } else if (companyCols.includes('company_name_he')) {
        nameField = 'company_name_he as name';
      } else if (companyCols.includes('company_name_en')) {
        nameField = 'company_name_en as name';
      }
      
      let registrationField = "'' as registration_number";
      if (companyCols.includes('company_registration_number')) {
        registrationField = 'company_registration_number as registration_number';
      } else if (companyCols.includes('registration_number')) {
        registrationField = 'registration_number';
      } else if (companyCols.includes('company_id')) {
        registrationField = 'company_id as registration_number';
      }
      
      const selectFields = [nameField, registrationField];

      const whereClause = companyCols.includes('client_id') 
        ? 'WHERE client_id = @clientId'
        : 'WHERE 1=1';

      const result = await pool
        .request()
        .input('clientId', sql.NVarChar, tenantCode)
        .query(`
          SELECT TOP 1 ${selectFields.join(', ')}
          FROM companies
          ${whereClause}
        `);

      if (result.recordset.length > 0) {
        const row = result.recordset[0];
        const companyName = row.name || '';
        const registrationNumber = row.registration_number || '';
        
        // Log what we found for debugging
        this.logger.log(`[getCompanyInfo] Found company from tenant DB: name="${companyName}", registration="${registrationNumber}"`);
        
        return {
          name: companyName || '',
          registration_number: registrationNumber || '',
        };
      } else {
        this.logger.warn(`[getCompanyInfo] No company found for tenant: ${tenantCode}`);
      }
    } catch (error) {
      this.logger.warn(`[getCompanyInfo] Error querying companies table: ${error.message}`);
    }

    return {
      name: '',
      registration_number: '',
    };
  }

  private parseConnectionString(connectionString: string): any {
    const config: any = { options: { trustServerCertificate: true } };
    const parts = connectionString.split(';');
    
    for (const part of parts) {
      const [key, value] = part.split('=').map(s => s.trim());
      if (!key || !value) continue;
      
      switch (key.toLowerCase()) {
        case 'server':
          config.server = value;
          break;
        case 'database':
          config.database = value;
          break;
        case 'user id':
        case 'userid':
          config.user = value;
          break;
        case 'password':
          config.password = value;
          break;
        case 'port':
          config.port = parseInt(value);
          break;
      }
    }
    
    return config;
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
    this.logger.log(`[generatePDF] ========== START PDF GENERATION ==========`);
    this.logger.log(`[generatePDF] Payslip ID: ${payslipId}, Tenant: ${tenantCode}, User: ${userId}, Role: ${userRole}`);
    
    // Get payslip data (currently returns mock data)
    this.logger.log(`[generatePDF] Step 1: Fetching payslip data...`);
    const payslipData = await this.getPayslip(payslipId, tenantId, tenantCode, userId, userRole);
    this.logger.log(`[generatePDF] Step 1: ✅ Payslip data fetched successfully`);

    // Get payslip template preference for the company (default: 'template1')
    this.logger.log(`[generatePDF] Step 2: Getting template preference for tenant: ${tenantCode}...`);
    const templatePreference = await this.getPayslipTemplatePreference(tenantCode);
    this.logger.log(`[generatePDF] Step 2: ✅ Template preference retrieved: ${templatePreference} for tenant: ${tenantCode}`);

    // Use Puppeteer-based generator (better Hebrew/RTL support)
    // Falls back to pdfkit if puppeteer is not available
    try {
      if (templatePreference === 'template2') {
        this.logger.log(`[generatePDF] Step 3: Using Template 2 (Israeli standard format)`);
        const pdfBuffer = await this.pdfGeneratorHtmlTemplate2.generatePayslipPDF(payslipData);
        this.logger.log(`[generatePDF] Step 3: ✅ Template 2 PDF generated, size: ${pdfBuffer.length} bytes`);
        this.logger.log(`[generatePDF] ========== END PDF GENERATION (Template 2) ==========`);
        return pdfBuffer;
      } else {
        this.logger.log(`[generatePDF] Step 3: Using Template 1 (default template)`);
        // Default to template1 (existing template)
        const pdfBuffer = await this.pdfGeneratorHtml.generatePayslipPDF(payslipData);
        this.logger.log(`[generatePDF] Step 3: ✅ Template 1 PDF generated, size: ${pdfBuffer.length} bytes`);
        this.logger.log(`[generatePDF] ========== END PDF GENERATION (Template 1) ==========`);
        return pdfBuffer;
      }
    } catch (error: any) {
      this.logger.error(`[generatePDF] Step 3: ❌ Puppeteer PDF generation failed: ${error.message}`, error.stack);
      this.logger.warn(`[generatePDF] Step 3: Falling back to pdfkit...`);
      const pdfBuffer = await this.pdfGenerator.generatePayslipPDF(payslipData);
      this.logger.log(`[generatePDF] Step 3: ✅ Fallback pdfkit PDF generated, size: ${pdfBuffer.length} bytes`);
      this.logger.log(`[generatePDF] ========== END PDF GENERATION (Fallback) ==========`);
      return pdfBuffer;
    }
  }

  /**
   * Get payslip template preference for a company
   * Returns 'template1' (default) or 'template2'
   */
  private async getPayslipTemplatePreference(tenantCode: string): Promise<'template1' | 'template2'> {
    try {
      // Get Control DB connection
      const controlDbUrl = process.env.CONTROL_DB_URL;
      if (!controlDbUrl) {
        this.logger.warn('[getPayslipTemplatePreference] CONTROL_DB_URL not set, using default template1');
        return 'template1';
      }

      const controlConfig = this.parseConnectionString(controlDbUrl);
      const controlPool = new sql.ConnectionPool(controlConfig);
      await controlPool.connect();

      try {
        // Check if payslip_template column exists in tenants table
        const columnsCheck = await controlPool
          .request()
          .query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'tenants'
              AND COLUMN_NAME = 'payslip_template'
          `);

        if (columnsCheck.recordset.length === 0) {
          // Column doesn't exist, return default
          this.logger.log('[getPayslipTemplatePreference] payslip_template column does not exist, using default template1');
          return 'template1';
        }

        // Get template preference from tenants table
        // Note: Removed is_active = 1 check to allow reading even if tenant is temporarily inactive
        const result = await controlPool
          .request()
          .input('tenantCode', sql.NVarChar, tenantCode)
          .query(`
            SELECT payslip_template, code, is_active
            FROM tenants
            WHERE code = @tenantCode
          `);

        this.logger.log(`[getPayslipTemplatePreference] Query result for tenantCode=${tenantCode}:`, {
          recordCount: result.recordset.length,
          records: result.recordset,
        });

        if (result.recordset.length > 0) {
          const template = result.recordset[0].payslip_template;
          this.logger.log(`[getPayslipTemplatePreference] Found template preference: ${template} for tenant: ${tenantCode}`);
          
          // Trim whitespace and convert to lowercase for comparison
          const normalizedTemplate = (template || '').toString().trim().toLowerCase();
          
          if (normalizedTemplate === 'template2') {
            this.logger.log(`[getPayslipTemplatePreference] Returning template2 for tenant: ${tenantCode}`);
            return 'template2';
          } else {
            this.logger.log(`[getPayslipTemplatePreference] Template is not 'template2' (value: '${template}'), returning template1`);
          }
        } else {
          this.logger.warn(`[getPayslipTemplatePreference] No tenant found with code: ${tenantCode}, using default template1`);
        }

        return 'template1'; // Default
      } finally {
        await controlPool.close();
      }
    } catch (error: any) {
      this.logger.error(`[getPayslipTemplatePreference] Error getting template preference: ${error.message}`, error.stack);
      return 'template1';
    }
  }

  /**
   * Update payslip template preference for a company
   */
  async updatePayslipTemplatePreference(
    tenantCode: string,
    template: 'template1' | 'template2',
  ): Promise<{ success: boolean; message: string }> {
    try {
      const controlDbUrl = process.env.CONTROL_DB_URL;
      if (!controlDbUrl) {
        throw new Error('CONTROL_DB_URL not configured');
      }

      const controlConfig = this.parseConnectionString(controlDbUrl);
      const controlPool = new sql.ConnectionPool(controlConfig);
      await controlPool.connect();

      try {
        // Check if payslip_template column exists
        const columnsCheck = await controlPool
          .request()
          .query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'tenants'
              AND COLUMN_NAME = 'payslip_template'
          `);

        if (columnsCheck.recordset.length === 0) {
          // Column doesn't exist, add it
          await controlPool
            .request()
            .query(`
              ALTER TABLE tenants
              ADD payslip_template NVARCHAR(50) NOT NULL DEFAULT 'template1'
            `);
          this.logger.log('[updatePayslipTemplatePreference] Added payslip_template column to tenants table');
        }

        // Update template preference
        // Note: Removed is_active = 1 check to allow updating even if tenant is temporarily inactive
        const result = await controlPool
          .request()
          .input('tenantCode', sql.NVarChar, tenantCode)
          .input('template', sql.NVarChar, template)
          .query(`
            UPDATE tenants
            SET payslip_template = @template
            WHERE code = @tenantCode
          `);

        this.logger.log(`[updatePayslipTemplatePreference] Update query executed, rowsAffected: ${result.rowsAffected[0]} for tenant: ${tenantCode}, template: ${template}`);

        if (result.rowsAffected[0] > 0) {
          this.logger.log(`[updatePayslipTemplatePreference] ✅ Successfully updated template to ${template} for tenant: ${tenantCode}`);
          
          // Verify the update by reading it back
          const verifyResult = await controlPool
            .request()
            .input('tenantCode', sql.NVarChar, tenantCode)
            .query(`
              SELECT payslip_template, code
              FROM tenants
              WHERE code = @tenantCode
            `);
          
          if (verifyResult.recordset.length > 0) {
            this.logger.log(`[updatePayslipTemplatePreference] ✅ Verified: Current template in DB is: ${verifyResult.recordset[0].payslip_template}`);
          }
          
          return {
            success: true,
            message: `Payslip template updated to ${template}`,
          };
        } else {
          this.logger.warn(`[updatePayslipTemplatePreference] ⚠️ No rows updated for tenant: ${tenantCode}. Tenant may not exist.`);
          return {
            success: false,
            message: 'Tenant not found',
          };
        }
      } finally {
        await controlPool.close();
      }
    } catch (error: any) {
      this.logger.error(`[updatePayslipTemplatePreference] Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current payslip template preference for a company
   */
  async getPayslipTemplatePreferenceForCompany(tenantCode: string): Promise<{ template: 'template1' | 'template2' }> {
    this.logger.log(`[getPayslipTemplatePreferenceForCompany] Getting template preference for tenant: ${tenantCode}`);
    const template = await this.getPayslipTemplatePreference(tenantCode);
    this.logger.log(`[getPayslipTemplatePreferenceForCompany] Template preference result: ${template}`);
    return { template };
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
    const pool = await this.getTenantPool(tenantCode);

    try {
      // First, check what columns exist in clc_payslips
      let columnsCheck;
      try {
        columnsCheck = await pool
          .request()
          .query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'clc_payslips'
            ORDER BY ORDINAL_POSITION
          `);
      } catch (error) {
        this.logger.warn(`[listPayslips] Could not check columns, using default query`);
        columnsCheck = { recordset: [] };
      }
      
      const availableColumns = columnsCheck.recordset.map((r: any) => r.COLUMN_NAME);
      this.logger.log(`[listPayslips] Available columns in clc_payslips:`, availableColumns);
      
      // Determine date column for ordering
      let dateColumn = null;
      let dateColumnAlias = 'GETDATE() as generation_date';
      
      if (availableColumns.includes('generation_date')) {
        dateColumn = 'generation_date';
        dateColumnAlias = 'ps.generation_date';
      } else if (availableColumns.includes('created_date')) {
        dateColumn = 'created_date';
        dateColumnAlias = 'ps.created_date as generation_date';
      } else if (availableColumns.includes('calc_date')) {
        dateColumn = 'calc_date';
        dateColumnAlias = 'ps.calc_date as generation_date';
      } else if (availableColumns.includes('issue_date')) {
        dateColumn = 'issue_date';
        dateColumnAlias = 'ps.issue_date as generation_date';
      }
      
      // Determine net_salary column
      let netSalaryColumn = '0 as net_salary';
      if (availableColumns.includes('net_salary')) {
        netSalaryColumn = 'ps.net_salary';
      } else if (availableColumns.includes('net_pay')) {
        netSalaryColumn = 'ps.net_pay as net_salary';
      } else if (availableColumns.includes('net_pay_month')) {
        netSalaryColumn = 'ps.net_pay_month as net_salary';
      } else if (availableColumns.includes('final_salary')) {
        netSalaryColumn = 'ps.final_salary as net_salary';
      }
      
      // Check employees table columns for name fields
      let empNameFields = "'' as first_name, '' as last_name";
      let empHasClientId = false;
      try {
        const empColsResult = await pool
          .request()
          .query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'employees'
              AND TABLE_SCHEMA = SCHEMA_NAME()
          `);
        const empCols = empColsResult.recordset.map((r: any) => r.COLUMN_NAME);
        const hasFirstName = empCols.includes('first_name');
        const hasLastName = empCols.includes('last_name');
        empHasClientId = empCols.includes('client_id');
        
        if (hasFirstName && hasLastName) {
          empNameFields = 'e.first_name, e.last_name';
        } else if (hasFirstName) {
          empNameFields = 'e.first_name, ' + (hasLastName ? 'e.last_name' : "'' as last_name");
        } else if (hasLastName) {
          empNameFields = "'' as first_name, e.last_name";
        }
      } catch (error) {
        // If employees table doesn't exist or can't check, use dummy fields
        empNameFields = "'' as first_name, '' as last_name";
      }

      // Build JOIN condition
      const joinCondition = availableColumns.includes('client_id') && empHasClientId
        ? 'ON ps.employee_id = e.employee_id AND ps.client_id = e.client_id'
        : 'ON ps.employee_id = e.employee_id';

      // clc_payslips doesn't have payslip_id, so we'll create a composite ID
      // Use + for SQL Server string concatenation
      let query = `
        SELECT 
          ps.period_id + '-' + ps.employee_id as id,
          ps.period_id,
          ps.employee_id,
          ${netSalaryColumn},
          ${dateColumnAlias},
          ${empNameFields}
        FROM clc_payslips ps
        LEFT JOIN employees e ${joinCondition}
        WHERE ps.client_id = @clientId
      `;

      if (userRole === 'EMPLOYEE') {
        query += ` AND ps.employee_id = @userId`;
      }

      query += ` ORDER BY ps.period_id DESC`;
      if (dateColumn) {
        query += `, ps.${dateColumn} DESC`;
      }

      const result = await pool
        .request()
        .input('clientId', sql.NVarChar, tenantCode)
        .input('userId', sql.NVarChar, userId)
        .query(query);

      const allPayslips = result.recordset.map((row: any) => {
        // Extract month and year from period_id (format: 'YYYY-MM')
        const [year, month] = row.period_id ? row.period_id.split('-').map(Number) : [null, null];

        return {
          id: row.id,
          month: month || new Date().getMonth() + 1,
          year: year || new Date().getFullYear(),
          employee_name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.employee_id,
          employee_id: row.employee_id,
          net_salary: parseFloat(row.net_salary) || 0,
          generation_date: row.generation_date?.toISOString() || new Date().toISOString(),
        };
      });

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
  }

  /**
   * Process payroll for one or more employees
   * Executes sp_calc_one_employee_period stored procedure
   */
  async processPayroll(
    dto: { employee_id?: string; employee_ids?: string[]; period_id: string; process_all?: boolean },
    tenantId: string,
    tenantCode: string,
  ): Promise<{ processed: number; failed: number; errors: string[]; payslip_ids?: string[]; payslip_id?: string }> {
    const pool = await this.getTenantPool(tenantCode);
    
    let employeeIds: string[] = [];
    
    if (dto.process_all) {
      // Check if is_active column exists
      const empColsResult = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'employees'
            AND TABLE_SCHEMA = SCHEMA_NAME()
        `);
      const empCols = empColsResult.recordset.map((r: any) => r.COLUMN_NAME);
      const hasIsActive = empCols.includes('is_active');
      const hasClientId = empCols.includes('client_id');
      const hasEmploymentStatus = empCols.includes('employment_status');

      // Build WHERE clause dynamically
      let whereClause = '';
      if (hasClientId) {
        whereClause = `WHERE LTRIM(RTRIM(client_id)) = LTRIM(RTRIM('${tenantCode}'))`;
        if (hasIsActive) {
          whereClause += ` AND is_active = 1`;
        }
      } else if (hasIsActive) {
        whereClause = `WHERE is_active = 1`;
      }
      
      // Filter out CONTRACTOR employees - only process EMPLOYEE status
      if (hasEmploymentStatus) {
        if (whereClause) {
          whereClause += ` AND LTRIM(RTRIM(employment_status)) != 'CONTRACTOR'`;
        } else {
          whereClause = `WHERE LTRIM(RTRIM(employment_status)) != 'CONTRACTOR'`;
        }
      }

      // Get all active employees (excluding CONTRACTOR)
      const employeesResult = await pool
        .request()
        .query(`
          SELECT employee_id 
          FROM employees 
          ${whereClause}
        `);
      employeeIds = employeesResult.recordset.map((row: any) => row.employee_id);
    } else if (dto.employee_ids && dto.employee_ids.length > 0) {
      // Filter out CONTRACTOR employees from the provided list
      // We need to check employment_status for each employee
      const filteredEmployeeIds: string[] = [];
      for (const empId of dto.employee_ids) {
        const empStatusResult = await pool
          .request()
          .input('employeeId', sql.NVarChar, empId.trim())
          .query(`
            SELECT employment_status
            FROM employees
            WHERE LTRIM(RTRIM(employee_id)) = LTRIM(RTRIM(@employeeId))
          `);
        
        if (empStatusResult.recordset.length > 0) {
          const employmentStatus = (empStatusResult.recordset[0].employment_status || '').trim().toUpperCase();
          if (employmentStatus !== 'CONTRACTOR') {
            filteredEmployeeIds.push(empId);
          } else {
            this.logger.log(`[processPayroll] Skipping CONTRACTOR employee: ${empId}`);
          }
        } else {
          // If status not found, include the employee (backward compatibility)
          filteredEmployeeIds.push(empId);
        }
      }
      employeeIds = filteredEmployeeIds;
    } else if (dto.employee_id) {
      // Check if single employee is CONTRACTOR
      const empStatusResult = await pool
        .request()
        .input('employeeId', sql.NVarChar, dto.employee_id.trim())
        .query(`
          SELECT employment_status
          FROM employees
          WHERE LTRIM(RTRIM(employee_id)) = LTRIM(RTRIM(@employeeId))
        `);
      
      if (empStatusResult.recordset.length > 0) {
        const employmentStatus = (empStatusResult.recordset[0].employment_status || '').trim().toUpperCase();
        if (employmentStatus === 'CONTRACTOR') {
          throw new Error('Cannot process payroll for CONTRACTOR employee. Only EMPLOYEE status can be processed.');
        }
      }
      
      employeeIds = [dto.employee_id];
    } else {
      throw new Error('Either employee_id, employee_ids, or process_all must be provided');
    }

    this.logger.log(`[processPayroll] Processing payroll for ${employeeIds.length} employees, period: ${dto.period_id}`);

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    const payslipIds: string[] = [];

    for (const employeeId of employeeIds) {
      try {
        const request = pool.request();
        request.input('client_id', sql.NVarChar, tenantCode);
        request.input('employee_id', sql.NVarChar, employeeId);
        request.input('period_id', sql.NVarChar, dto.period_id);

        await request.execute('sp_calc_one_employee_period');
        
        // After SP execution, find the created payslip
        // clc_payslips doesn't have payslip_id, so we'll create a composite ID
        // Use + for SQL Server string concatenation
        const payslipResult = await pool
          .request()
          .input('clientId', sql.NVarChar, tenantCode.trim())
          .input('employeeId', sql.NVarChar, employeeId.trim())
          .input('periodId', sql.NVarChar, dto.period_id.trim())
          .query(`
            SELECT TOP 1 period_id + '-' + employee_id as payslip_id
            FROM clc_payslips
            WHERE LTRIM(RTRIM(client_id)) = LTRIM(RTRIM(@clientId)) 
              AND LTRIM(RTRIM(employee_id)) = LTRIM(RTRIM(@employeeId)) 
              AND LTRIM(RTRIM(period_id)) = LTRIM(RTRIM(@periodId))
            ORDER BY period_id DESC, employee_id DESC
          `);
        
        if (payslipResult.recordset.length > 0) {
          payslipIds.push(payslipResult.recordset[0].payslip_id);
        }
        
        processed++;
        this.logger.log(`[processPayroll] Successfully processed payroll for employee ${employeeId}`);
      } catch (error: any) {
        failed++;
        const errorMsg = `Employee ${employeeId}: ${error.message || 'Unknown error'}`;
        errors.push(errorMsg);
        this.logger.error(`[processPayroll] Failed to process payroll for employee ${employeeId}:`, error);
      }
    }

    return {
      processed,
      failed,
      errors,
      payslip_ids: payslipIds.length > 0 ? payslipIds : undefined,
      payslip_id: payslipIds.length === 1 ? payslipIds[0] : undefined, // Single payslip ID for convenience
    };
  }
}

