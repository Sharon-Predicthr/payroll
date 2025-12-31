import { Injectable, Logger } from '@nestjs/common';
import { BaseTenantService } from '../../common/services/base-tenant.service';
import { TenantResolverService } from '../auth/tenant-resolver.service';
import * as sql from 'mssql';

export interface DashboardKPIs {
  employees_paid: number;
  gross_payroll_month: number;
  average_payroll_month: number;
  average_tariff_daily: number;
  average_job_percent: number;
  vacation_balance_debit: number;
  sick_balance_debit: number;
  havraa_balance_debit: number;
  employer_cost_month: number;
  employer_cost_without_hr_month: number;
  employer_cost_with_hr_month: number;
  gross_net_payment_month: number;
  average_net_payment_month: number;
  audit_errors: number;
  audit_warnings: number;
}

export interface DepartmentBreakdown {
  department_number: number;
  department_name: string;
  employees_paid: number;
  gross_payroll_month: number;
  average_payroll_month: number;
  average_tariff_daily: number;
  average_job_percent: number;
  vacation_balance_debit: number;
  sick_balance_debit: number;
  havraa_balance_debit: number;
  employer_cost_month: number;
  employer_cost_with_hr_month: number;
  gross_net_payment_month: number;
  average_net_payment_month: number;
}

export interface CostsTrend {
  period_id: string;
  employees_paid: number;
  gross_payroll_month: number;
  average_payroll_month: number;
  average_tariff_daily: number;
  average_job_percent: number;
  vacation_balance_debit: number;
  sick_balance_debit: number;
  havraa_balance_debit: number;
  employer_cost_month: number;
  employer_cost_with_hr_month: number;
  gross_net_payment_month: number;
  average_net_payment_month: number;
}

@Injectable()
export class DashboardService extends BaseTenantService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(tenantResolver: TenantResolverService) {
    super(tenantResolver);
  }

  /**
   * Get dashboard KPIs for current pay period
   */
  async getKPIs(tenantCode: string, periodId: string): Promise<DashboardKPIs> {
    this.logger.log(`[getKPIs] Getting KPIs for tenant: ${tenantCode}, period: ${periodId}`);
    
    const pool = await this.getTenantPool(tenantCode);
    
    try {
      const request = pool.request();
      request.input('client_id', sql.NVarChar, tenantCode);
      request.input('period_id', sql.NVarChar, periodId);
      
      this.logger.log(`[getKPIs] Executing sp_dashboard_home_kpis with client_id=${tenantCode}, period_id=${periodId}`);
      const result = await request.execute('sp_dashboard_home_kpis');
      
      if (!result.recordset || result.recordset.length === 0) {
        this.logger.warn(`[getKPIs] No data returned from sp_dashboard_home_kpis`);
        // Return default values
        return this.getDefaultKPIs();
      }
      
      const row = result.recordset[0];
      
      return {
        employees_paid: row.employees_paid || 0,
        gross_payroll_month: row.gross_payroll_month || 0,
        average_payroll_month: row.average_payroll_month || 0,
        average_tariff_daily: row.average_tariff_daily || 0,
        average_job_percent: row.average_job_percent || 0,
        vacation_balance_debit: row.vacation_balance_debit || 0,
        sick_balance_debit: row.sick_balance_debit || 0,
        havraa_balance_debit: row.havraa_balance_debit || 0,
        employer_cost_month: row.employer_cost_month || 0,
        employer_cost_without_hr_month: row.employer_cost_without_hr_month || 0,
        employer_cost_with_hr_month: row.employer_cost_with_hr_month || 0,
        gross_net_payment_month: row.gross_net_payment_month || 0,
        average_net_payment_month: row.average_net_payment_month || 0,
        audit_errors: row.audit_errors || 0,
        audit_warnings: row.audit_warnings || 0,
      };
    } catch (error: any) {
      this.logger.error(`[getKPIs] Error executing sp_dashboard_home_kpis:`, error);
      throw error;
    }
  }

  /**
   * Get department breakdown for current pay period
   */
  async getDepartmentBreakdown(tenantCode: string, periodId: string): Promise<DepartmentBreakdown[]> {
    this.logger.log(`[getDepartmentBreakdown] Getting department breakdown for tenant: ${tenantCode}, period: ${periodId}`);
    
    const pool = await this.getTenantPool(tenantCode);
    
    try {
      const request = pool.request();
      request.input('client_id', sql.NVarChar, tenantCode);
      request.input('period_id', sql.NVarChar, periodId);
      
      this.logger.log(`[getDepartmentBreakdown] Executing sp_dashboard_department_breakdown with client_id=${tenantCode}, period_id=${periodId}`);
      const result = await request.execute('sp_dashboard_department_breakdown');
      
      if (!result.recordset || result.recordset.length === 0) {
        this.logger.warn(`[getDepartmentBreakdown] No data returned from sp_dashboard_department_breakdown`);
        return [];
      }
      
      return result.recordset.map((row: any) => ({
        department_number: row.department_number || 0,
        department_name: row.department_name || '',
        employees_paid: row.employees_paid || 0,
        gross_payroll_month: row.gross_payroll_month || 0,
        average_payroll_month: row.average_payroll_month || 0,
        average_tariff_daily: row.average_tariff_daily || 0,
        average_job_percent: row.average_job_percent || 0,
        vacation_balance_debit: row.vacation_balance_debit || 0,
        sick_balance_debit: row.sick_balance_debit || 0,
        havraa_balance_debit: row.havraa_balance_debit || 0,
        employer_cost_month: row.employer_cost_month || 0,
        employer_cost_with_hr_month: row.employer_cost_with_hr_month || 0,
        gross_net_payment_month: row.gross_net_payment_month || 0,
        average_net_payment_month: row.average_net_payment_month || 0,
      }));
    } catch (error: any) {
      this.logger.error(`[getDepartmentBreakdown] Error executing sp_dashboard_department_breakdown:`, error);
      throw error;
    }
  }

  /**
   * Get costs trends (up to 12 periods)
   */
  async getCostsTrends(tenantCode: string, periodId: string): Promise<CostsTrend[]> {
    this.logger.log(`[getCostsTrends] Getting costs trends for tenant: ${tenantCode}, period: ${periodId}`);
    
    const pool = await this.getTenantPool(tenantCode);
    
    try {
      const request = pool.request();
      request.input('client_id', sql.NVarChar, tenantCode);
      request.input('period_id', sql.NVarChar, periodId);
      
      this.logger.log(`[getCostsTrends] Executing sp_dashboard_costs_trends with client_id=${tenantCode}, period_id=${periodId}`);
      const result = await request.execute('sp_dashboard_costs_trends');
      
      if (!result.recordset || result.recordset.length === 0) {
        this.logger.warn(`[getCostsTrends] No data returned from sp_dashboard_costs_trends`);
        return [];
      }
      
      return result.recordset.map((row: any) => ({
        period_id: row.period_id || '',
        employees_paid: row.employees_paid || 0,
        gross_payroll_month: row.gross_payroll_month || 0,
        average_payroll_month: row.average_payroll_month || 0,
        average_tariff_daily: row.average_tariff_daily || 0,
        average_job_percent: row.average_job_percent || 0,
        vacation_balance_debit: row.vacation_balance_debit || 0,
        sick_balance_debit: row.sick_balance_debit || 0,
        havraa_balance_debit: row.havraa_balance_debit || 0,
        employer_cost_month: row.employer_cost_month || 0,
        employer_cost_with_hr_month: row.employer_cost_with_hr_month || 0,
        gross_net_payment_month: row.gross_net_payment_month || 0,
        average_net_payment_month: row.average_net_payment_month || 0,
      }));
    } catch (error: any) {
      this.logger.error(`[getCostsTrends] Error executing sp_dashboard_costs_trends:`, error);
      throw error;
    }
  }

  /**
   * Return default KPIs when no data is available
   */
  private getDefaultKPIs(): DashboardKPIs {
    return {
      employees_paid: 0,
      gross_payroll_month: 0,
      average_payroll_month: 0,
      average_tariff_daily: 0,
      average_job_percent: 0,
      vacation_balance_debit: 0,
      sick_balance_debit: 0,
      havraa_balance_debit: 0,
      employer_cost_month: 0,
      employer_cost_without_hr_month: 0,
      employer_cost_with_hr_month: 0,
      gross_net_payment_month: 0,
      average_net_payment_month: 0,
      audit_errors: 0,
      audit_warnings: 0,
    };
  }
}

