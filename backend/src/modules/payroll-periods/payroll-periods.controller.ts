import { Controller, Get, Post, Body, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantConnectionGuard } from '../../common/guards/tenant-connection.guard';
import { PayrollPeriodsService } from './payroll-periods.service';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';

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

  @Post()
  @UseGuards(AuthGuard('jwt'), TenantConnectionGuard)
  async createPayrollPeriod(
    @Body() dto: CreatePayrollPeriodDto,
    @Request() req: any,
  ) {
    // Check if user is admin (PAYROLL_MANAGER)
    const userRole = req.user.role;
    if (userRole !== 'PAYROLL_MANAGER') {
      throw new ForbiddenException('Only payroll managers can create payroll periods');
    }

    const tenantCode = req.tenantCode || req.user.tenantCode;

    const period = await this.payrollPeriodsService.createPayrollPeriod(
      dto,
      tenantCode,
    );

    return {
      success: true,
      data: period,
      message: 'Payroll period created successfully',
    };
  }
}

