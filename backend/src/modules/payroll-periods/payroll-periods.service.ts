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

      this.logger.log(`[getPayrollPeriods] Fetching periods for tenant: ${tenantCode}`);

      const result = await request.query(query);

      this.logger.log(`[getPayrollPeriods] Found ${result.recordset.length} periods`);
      
      if (result.recordset.length === 0) {
        this.logger.warn(`[getPayrollPeriods] No periods found for tenant: ${tenantCode}, client_id: ${tenantCode}`);
      }

      return result.recordset.map((row: any) => {
        // Map fields based on actual table structure:
        // client_id, period_id, start_date, end_date, pay_date, tax_year, is_closed
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
        
        // Determine active status: not closed and current date is within period
        let isActive = false;
        if (!isClosed && startDate && endDate) {
          const now = new Date();
          const start = new Date(startDate);
          const end = new Date(endDate);
          // Set time to start/end of day for comparison
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          isActive = now >= start && now <= end;
        }

        return {
          period_id: periodId,
          period_description: description,
          period_start_date: startDate,
          period_end_date: endDate,
          pay_date: payDate,
          tax_year: taxYear,
          is_active: isActive,
          is_closed: isClosed,
          client_id: row.client_id || tenantCode,
          ...row, // Include all other fields
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
    // Find the active period (is_active = true and is_closed = false)
    const currentPeriod = periods.find(
      (p) => p.is_active === true && p.is_closed === false,
    );
    return currentPeriod || periods[0] || null; // Return first period if no active one
  }
}

