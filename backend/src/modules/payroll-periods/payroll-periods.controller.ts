import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantConnectionGuard } from '../../common/guards/tenant-connection.guard';
import { PayrollPeriodsService } from './payroll-periods.service';

@Controller('payroll-periods')
export class PayrollPeriodsController {
  constructor(private payrollPeriodsService: PayrollPeriodsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), TenantConnectionGuard)
  async getPayrollPeriods(@Request() req: any) {
    const tenantId = req.user.tenant_id;
    const tenantCode = req.tenantCode || req.user.tenantCode;

    const periods = await this.payrollPeriodsService.getPayrollPeriods(
      tenantId,
      tenantCode,
    );

    return {
      success: true,
      data: periods,
    };
  }

  @Get('current')
  @UseGuards(AuthGuard('jwt'), TenantConnectionGuard)
  async getCurrentPeriod(@Request() req: any) {
    const tenantId = req.user.tenant_id;
    const tenantCode = req.tenantCode || req.user.tenantCode;

    const currentPeriod = await this.payrollPeriodsService.getCurrentPeriod(
      tenantId,
      tenantCode,
    );

    return {
      success: true,
      data: currentPeriod,
    };
  }
}

