import { Controller, Get, Param, Delete, Query, UseGuards, Request, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantConnectionGuard } from '../../common/guards/tenant-connection.guard';
import { EmployeesService } from './employees.service';

@Controller('employees')
@UseGuards(AuthGuard('jwt'), TenantConnectionGuard)
export class EmployeesController {
  private readonly logger = new Logger(EmployeesController.name);

  constructor(private employeesService: EmployeesService) {
    this.logger.log('EmployeesController initialized');
  }

  /**
   * Get all employees (master list) with pagination
   * GET /employees?page=1&limit=20
   */
  @Get()
  async getEmployees(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const tenantCode = req.tenantCode;
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 20;
      
      const result = await this.employeesService.getEmployees(tenantCode, pageNum, limitNum);
      
      return {
        success: true,
        data: result.employees,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error: any) {
      console.error('[EmployeesController] Error:', error);
      throw error;
    }
  }

  /**
   * Get employee by ID with all related data
   * GET /employees/:id
   */
  @Get(':id')
  async getEmployeeById(@Param('id') id: string, @Request() req: any) {
    const tenantCode = req.tenantCode;
    const employee = await this.employeesService.getEmployeeById(tenantCode, id);
    return {
      success: true,
      data: employee,
    };
  }

  /**
   * Terminate/Delete employee (delete from master and all detail tables)
   * DELETE /employees/:id
   */
  @Delete(':id')
  async terminateEmployee(@Param('id') id: string, @Request() req: any) {
    const tenantCode = req.tenantCode;
    await this.employeesService.terminateEmployee(tenantCode, id);
    return {
      success: true,
      message: 'Employee terminated successfully',
    };
  }
}

