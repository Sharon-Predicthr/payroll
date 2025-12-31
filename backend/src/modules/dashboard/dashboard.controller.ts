import { Controller, Get, Query, UseGuards, Request, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantConnectionGuard } from '../../common/guards/tenant-connection.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), TenantConnectionGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private dashboardService: DashboardService) {
    this.logger.log('DashboardController initialized');
  }

  /**
   * Get dashboard KPIs
   * GET /dashboard/kpis?period_id=2024-01
   */
  @Get('kpis')
  async getKPIs(
    @Request() req: any,
    @Query('period_id') periodId: string,
  ) {
    try {
      const tenantCode = req.tenantCode;
      
      if (!periodId) {
        return {
          success: false,
          message: 'period_id is required',
        };
      }
      
      const kpis = await this.dashboardService.getKPIs(tenantCode, periodId);
      
      return {
        success: true,
        data: kpis,
      };
    } catch (error: any) {
      this.logger.error(`[getKPIs] Error:`, error);
      throw error;
    }
  }

  /**
   * Get department breakdown
   * GET /dashboard/departments?period_id=2024-01
   */
  @Get('departments')
  async getDepartmentBreakdown(
    @Request() req: any,
    @Query('period_id') periodId: string,
  ) {
    try {
      const tenantCode = req.tenantCode;
      
      if (!periodId) {
        return {
          success: false,
          message: 'period_id is required',
        };
      }
      
      const breakdown = await this.dashboardService.getDepartmentBreakdown(tenantCode, periodId);
      
      return {
        success: true,
        data: breakdown,
      };
    } catch (error: any) {
      this.logger.error(`[getDepartmentBreakdown] Error:`, error);
      throw error;
    }
  }

  /**
   * Get costs trends
   * GET /dashboard/trends?period_id=2024-01
   */
  @Get('trends')
  async getCostsTrends(
    @Request() req: any,
    @Query('period_id') periodId: string,
  ) {
    try {
      const tenantCode = req.tenantCode;
      
      if (!periodId) {
        return {
          success: false,
          message: 'period_id is required',
        };
      }
      
      const trends = await this.dashboardService.getCostsTrends(tenantCode, periodId);
      
      return {
        success: true,
        data: trends,
      };
    } catch (error: any) {
      this.logger.error(`[getCostsTrends] Error:`, error);
      throw error;
    }
  }
}

