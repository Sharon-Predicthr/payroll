import { Controller, Get, Param, Delete, Put, Post, Body, Query, UseGuards, Request, Logger, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantConnectionGuard } from '../../common/guards/tenant-connection.guard';
import { EmployeesService } from './employees.service';
import { SaveEmployeeDto } from './dto/save-employee.dto';
import { AddEmployeeDto } from './dto/add-employee.dto';

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
      this.logger.log(`[getEmployees] Controller received tenantCode: ${tenantCode}`);
      this.logger.log(`[getEmployees] Request tenantCode from req: ${JSON.stringify(req.tenantCode)}`);
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 20;
      
      if (!tenantCode) {
        this.logger.error('[getEmployees] tenantCode is missing from request!');
      }
      
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
   * Add a new employee using sp_add_employee stored procedure
   * POST /employees/add
   * NOTE: This must be defined BEFORE @Get(':id') to avoid route conflicts
   */
  @Post('add')
  async addEmployee(
    @Body() addEmployeeDto: AddEmployeeDto,
    @Request() req: any,
  ) {
    try {
      const tenantCode = req.tenantCode;
      this.logger.log(`[addEmployee] Received request to add employee: ${addEmployeeDto.employee_id}`);
      
      // Validate mandatory fields
      const mandatoryFields = [
        'employee_id', 'tz_id', 'first_name', 'last_name', 'gender',
        'date_of_birth', 'hire_date', 'employment_status', 'department_number'
      ];
      const missingFields = mandatoryFields.filter(field => !addEmployeeDto[field]);
      
      if (missingFields.length > 0) {
        throw new BadRequestException(`Missing mandatory fields: ${missingFields.join(', ')}`);
      }
      
      // Call the stored procedure
      const result = await this.employeesService.addEmployee(tenantCode, addEmployeeDto);
      
      // If SP returned error code, throw an exception with the message
      if (result.status_code !== 0) {
        const errorMessages: Record<number, string> = {
          10: "לקוח לא נמצא",
          11: "עובד כבר קיים",
          12: "תעודת זהות לא תקינה",
          13: "מין לא תקין",
          14: "סטטוס העסקה לא תקין",
          15: "מחלקה לא נמצאה או לא פעילה",
          16: "אחוז העסקה מחוץ לטווח",
          17: "אין תקופת שכר פתוחה או תאריך העסקה מחוץ לתקופה הנוכחית",
          99: "שגיאה בלתי צפויה",
        };
        
        const errorMessage = errorMessages[result.status_code] || result.status_message || `שגיאה בהוספת עובד (קוד שגיאה: ${result.status_code})`;
        throw new BadRequestException({
          status_code: result.status_code,
          status_message: errorMessage,
          message: errorMessage,
        });
      }
      
      return {
        success: true,
        status_code: result.status_code,
        status_message: result.status_message,
        employee_id: result.employee_id,
      };
    } catch (error: any) {
      this.logger.error(`[addEmployee] Controller error:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // If it's already a BadRequestException with status_code/status_message, preserve them
      if (error.response?.status_code !== undefined || error.response?.status_message) {
        throw new BadRequestException({
          message: error.response?.message || error.response?.status_message || error.message || 'Failed to add employee',
          status_code: error.response?.status_code || 99,
          status_message: error.response?.status_message || error.message || 'Failed to add employee',
        });
      }
      
      // If error has status_code and status_message directly
      if (error.status_code !== undefined || error.status_message) {
        throw new BadRequestException({
          message: error.message || error.status_message || 'Failed to add employee',
          status_code: error.status_code || 99,
          status_message: error.status_message || error.message || 'Failed to add employee',
        });
      }
      
      // Otherwise, wrap it
      throw new BadRequestException(error.message || 'Failed to add employee');
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
   * Update employee
   * PUT /employees/:id
   */
  @Put(':id')
  async updateEmployee(
    @Param('id') id: string,
    @Body() updateData: Record<string, any>,
    @Request() req: any,
  ) {
    const tenantCode = req.tenantCode;
    const updatedEmployee = await this.employeesService.updateEmployee(tenantCode, id, updateData);
    return {
      success: true,
      data: updatedEmployee,
      message: 'Employee updated successfully',
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

  /**
   * Create a new pension record for an employee
   * POST /employees/:id/pension
   */
  @Post(':id/pension')
  async createPensionRecord(
    @Param('id') id: string,
    @Body() pensionData: Record<string, any>,
    @Request() req: any,
  ) {
    const tenantCode = req.tenantCode;
    const record = await this.employeesService.createPensionRecord(tenantCode, id, pensionData);
    return {
      success: true,
      data: record,
      message: 'Pension record created successfully',
    };
  }

  /**
   * Update a pension record
   * PUT /employees/:id/pension/:pensionId
   */
  @Put(':id/pension/:pensionId')
  async updatePensionRecord(
    @Param('id') id: string,
    @Param('pensionId') pensionId: string,
    @Body() pensionData: Record<string, any>,
    @Request() req: any,
  ) {
    const tenantCode = req.tenantCode;
    const record = await this.employeesService.updatePensionRecord(tenantCode, id, pensionId, pensionData);
    return {
      success: true,
      data: record,
      message: 'Pension record updated successfully',
    };
  }

  /**
   * Delete a pension record
   * DELETE /employees/:id/pension/:pensionId
   */
  @Delete(':id/pension/:pensionId')
  async deletePensionRecord(
    @Param('id') id: string,
    @Param('pensionId') pensionId: string,
    @Request() req: any,
  ) {
    const tenantCode = req.tenantCode;
    await this.employeesService.deletePensionRecord(tenantCode, id, pensionId);
    return {
      success: true,
      message: 'Pension record deleted successfully',
    };
  }

  /**
   * Save all employee data in a single transaction
   * PUT /employees/:id/save-all
   * 
   * This endpoint saves all changes to employee master and detail tables
   * in a single transaction, ensuring atomicity (all or nothing).
   * 
   * Request body structure:
   * {
   *   master?: { ... },           // Update employees table
   *   tax?: { ... },               // Update/Insert employees_tax
   *   contracts?: {                // employees_contracts
   *     created?: [...],
   *     updated?: [...],
   *     deleted?: [...]
   *   },
   *   attendance?: { ... },         // employees_attendance
   *   bank_details?: { ... },      // employees_bank_details
   *   pension?: { ... },           // employees_pension
   *   pay_items?: { ... }          // employees_pay_items
   * }
   */
  @Put(':id/save-all')
  async saveAllEmployeeData(
    @Param('id') id: string,
    @Body() saveData: SaveEmployeeDto,
    @Request() req: any,
  ) {
    this.logger.log(`[saveAllEmployeeData] Received save request for employee ${id}`);
    this.logger.debug(`[saveAllEmployeeData] Save data keys: ${Object.keys(saveData).join(', ')}`);
    
    const tenantCode = req.tenantCode;
    const result = await this.employeesService.saveAllEmployeeData(tenantCode, id, saveData);
    
    return {
      success: result.success,
      message: result.message,
      details: result.details,
    };
  }
}

