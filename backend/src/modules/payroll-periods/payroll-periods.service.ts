import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as sql from 'mssql';
import { TenantResolverService } from '../auth/tenant-resolver.service';

export interface PayrollPeriod {
  period_id: string;
  period_description: string;
  period_start_date: Date;
  period_end_date: Date;
  is_active: boolean;
  is_closed: boolean;
  client_id?: string;
  [key: string]: any; // For any additional fields
}

@Injectable()
export class PayrollPeriodsService {
  private readonly logger = new Logger(PayrollPeriodsService.name);

  constructor(private tenantResolver: TenantResolverService) {}

  async getPayrollPeriods(
    tenantId: string,
    tenantCode: string,
  ): Promise<PayrollPeriod[]> {
    try {
      const pool = await this.tenantResolver.getTenantPool(tenantCode);
      if (!pool) {
        throw new BadRequestException('Failed to get database connection');
      }

      // First, check if table exists
      const tableCheckQuery = `
        SELECT COUNT(*) as table_exists
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = 'xlg_pay_periods'
      `;
      
      const tableCheck = await pool.request().query(tableCheckQuery);
      if (tableCheck.recordset[0].table_exists === 0) {
        this.logger.warn(`[getPayrollPeriods] Table xlg_pay_periods does not exist for tenant: ${tenantCode}`);
        return []; // Return empty array if table doesn't exist
      }

      // Query xlg_pay_periods table
      // Table structure: client_id, period_id, start_date, end_date, pay_date, tax_year, is_closed
      const query = `
        SELECT *
        FROM xlg_pay_periods
        WHERE client_id = @clientId
        ORDER BY 
          CASE 
            WHEN start_date IS NOT NULL THEN start_date 
            ELSE '1900-01-01'
          END DESC
      `;

      const request = pool.request();
      request.input('clientId', sql.NVarChar, tenantCode);

      this.logger.log(`[getPayrollPeriods] Fetching periods for tenant: ${tenantCode}, client_id: ${tenantCode}`);

      const result = await request.query(query);

      this.logger.log(`[getPayrollPeriods] Found ${result.recordset.length} periods`);
      this.logger.log(`[getPayrollPeriods] Raw result.recordset:`, JSON.stringify(result.recordset, null, 2));
      
      if (result.recordset.length === 0) {
        this.logger.warn(`[getPayrollPeriods] No periods found for tenant: ${tenantCode}, client_id: ${tenantCode}`);
        this.logger.warn(`[getPayrollPeriods] Query was: SELECT * FROM xlg_pay_periods WHERE client_id = '${tenantCode}'`);
      }

      // First, map all periods and find the maximum period_id
      const allPeriods = result.recordset.map((row: any) => {
        const periodId = row.period_id || '';
        const startDate = row.start_date || row.period_start_date;
        const endDate = row.end_date || row.period_end_date;
        const payDate = row.pay_date;
        const taxYear = row.tax_year;
        
        // Create description from period_id (e.g., "2025-01" -> "ינואר 2025")
        let description = periodId;
        if (periodId && periodId.includes('-')) {
          const [year, month] = periodId.split('-');
          const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 
                             'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
          const monthNum = parseInt(month) - 1;
          if (monthNum >= 0 && monthNum < 12) {
            description = `${monthNames[monthNum]} ${year}`;
          }
        }
        
        // Determine closed status
        const isClosed = row.is_closed === true || row.is_closed === 1 || row.is_closed === '1';

        // Convert dates to ISO strings for JSON serialization
        const formatDate = (date: any): string | null => {
          if (!date) return null;
          try {
            const d = new Date(date);
            return isNaN(d.getTime()) ? null : d.toISOString();
          } catch {
            return null;
          }
        };

        return {
          period_id: periodId,
          period_description: description,
          period_start_date: formatDate(startDate),
          period_end_date: formatDate(endDate),
          pay_date: formatDate(payDate),
          tax_year: taxYear,
          is_closed: isClosed,
          client_id: row.client_id || tenantCode,
        };
      });

      // Find the maximum period_id (lexicographically highest)
      // Sort periods by period_id descending to find the maximum
      const sortedPeriods = [...allPeriods].sort((a, b) => {
        // Compare period_id strings (e.g., "2025-12" > "2025-02" > "2025-01")
        return b.period_id.localeCompare(a.period_id);
      });
      
      const maxPeriodId = sortedPeriods.length > 0 ? sortedPeriods[0].period_id : null;
      this.logger.log(`[getPayrollPeriods] Maximum period_id found: ${maxPeriodId}`);

      // Mark the period with maximum period_id as active (if not closed)
      return allPeriods.map((period) => {
        const isActive = period.period_id === maxPeriodId && !period.is_closed;
        return {
          ...period,
          is_active: isActive,
        };
      });
    } catch (error: any) {
      this.logger.error(`[getPayrollPeriods] Error:`, error);
      throw new BadRequestException(
        error.message || 'Failed to fetch payroll periods',
      );
    }
  }

  async getCurrentPeriod(
    tenantId: string,
    tenantCode: string,
  ): Promise<PayrollPeriod | null> {
    const periods = await this.getPayrollPeriods(tenantId, tenantCode);
    // Find the period with maximum period_id (the active one)
    // Sort by period_id descending to get the maximum
    const sortedPeriods = [...periods].sort((a, b) => {
      return b.period_id.localeCompare(a.period_id);
    });
    // Return the maximum period_id that is not closed, or just the maximum if all are closed
    const currentPeriod = sortedPeriods.find((p) => !p.is_closed) || sortedPeriods[0] || null;
    return currentPeriod;
  }

  async createPayrollPeriod(
    dto: {
      period_id: string;
      start_date: Date | string;
      end_date: Date | string;
      pay_date?: Date | string;
      tax_year?: number;
      is_closed?: boolean;
    },
    tenantCode: string,
  ): Promise<PayrollPeriod> {
    try {
      const pool = await this.tenantResolver.getTenantPool(tenantCode);
      if (!pool) {
        throw new BadRequestException('Failed to get database connection');
      }

      // Check if table exists
      const tableCheckQuery = `
        SELECT COUNT(*) as table_exists
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = 'xlg_pay_periods'
      `;
      
      const tableCheck = await pool.request().query(tableCheckQuery);
      if (tableCheck.recordset[0].table_exists === 0) {
        throw new BadRequestException('Table xlg_pay_periods does not exist');
      }

      // Check if period_id already exists
      const checkQuery = `
        SELECT period_id
        FROM xlg_pay_periods
        WHERE client_id = @clientId AND period_id = @periodId
      `;

      const checkResult = await pool
        .request()
        .input('clientId', sql.NVarChar, tenantCode)
        .input('periodId', sql.NVarChar, dto.period_id)
        .query(checkQuery);

      if (checkResult.recordset.length > 0) {
        throw new BadRequestException(`Period ${dto.period_id} already exists`);
      }

      // Insert new period
      const insertQuery = `
        INSERT INTO xlg_pay_periods (
          client_id,
          period_id,
          start_date,
          end_date,
          pay_date,
          tax_year,
          is_closed
        )
        VALUES (
          @clientId,
          @periodId,
          @startDate,
          @endDate,
          @payDate,
          @taxYear,
          @isClosed
        )
      `;

      const request = pool.request();
      request.input('clientId', sql.NVarChar, tenantCode);
      request.input('periodId', sql.NVarChar, dto.period_id);
      request.input('startDate', sql.Date, dto.start_date);
      request.input('endDate', sql.Date, dto.end_date);
      
      if (dto.pay_date) {
        request.input('payDate', sql.Date, dto.pay_date);
      } else {
        request.input('payDate', sql.Date, null);
      }
      
      if (dto.tax_year !== undefined && dto.tax_year !== null) {
        request.input('taxYear', sql.Int, dto.tax_year);
      } else {
        // Extract year from period_id if not provided
        const year = dto.period_id.split('-')[0];
        request.input('taxYear', sql.Int, parseInt(year) || new Date().getFullYear());
      }
      
      request.input('isClosed', sql.Bit, dto.is_closed === true ? 1 : 0);

      await request.query(insertQuery);

      this.logger.log(`[createPayrollPeriod] Created period ${dto.period_id} for tenant ${tenantCode}`);

      // Return the created period by fetching it
      const periods = await this.getPayrollPeriods('', tenantCode);
      const createdPeriod = periods.find(p => p.period_id === dto.period_id);
      
      if (!createdPeriod) {
        throw new BadRequestException('Failed to retrieve created period');
      }

      return createdPeriod;
    } catch (error: any) {
      this.logger.error(`[createPayrollPeriod] Error:`, error);
      throw new BadRequestException(
        error.message || 'Failed to create payroll period',
      );
    }
  }
}

