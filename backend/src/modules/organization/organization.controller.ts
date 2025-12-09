import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantConnectionGuard } from '../../common/guards/tenant-connection.guard';
import { OrganizationService } from './organization.service';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { TenantResolverService } from '../auth/tenant-resolver.service';
import * as sql from 'mssql';

@Controller('org')
@UseGuards(AuthGuard('jwt'), TenantConnectionGuard)
export class OrganizationController {
  private readonly logger = new Logger(OrganizationController.name);

  constructor(
    private organizationService: OrganizationService,
    private tenantResolverService: TenantResolverService,
  ) {
    this.logger.log('OrganizationController initialized');
  }

  /**
   * Helper to get tenantId from tenantCode
   */
  private async getTenantId(tenantCode: string): Promise<string> {
    const controlPool = await this.tenantResolverService.ensureControlPool();
    const result = await controlPool
      .request()
      .input('code', sql.NVarChar, tenantCode)
      .query('SELECT id FROM tenants WHERE code = @code AND is_active = 1');

    if (result.recordset.length === 0) {
      throw new Error(`Tenant not found: ${tenantCode}`);
    }

    return result.recordset[0].id;
  }

  // ============================================================
  // ORG LEVELS ENDPOINTS
  // ============================================================

  /**
   * GET /org/test
   * Test endpoint to verify controller is working
   */
  @Get('test')
  async test(@Request() req: any) {
    this.logger.log('[test] Test endpoint called');
    return {
      success: true,
      message: 'Organization controller is working',
      path: req.path,
      originalUrl: req.originalUrl,
    };
  }

  /**
   * GET /org/levels
   * List all organization levels for the tenant
   */
  @Get('levels')
  async listLevels(@Request() req: any) {
    const tenantCode = req.tenantCode;
    const tenantId = await this.getTenantId(tenantCode);
    const levels = await this.organizationService.listLevels(tenantId, tenantCode);
    return {
      success: true,
      data: levels,
    };
  }

  /**
   * POST /api/org/levels
   * Create a new organization level
   */
  @Post('levels')
  @HttpCode(HttpStatus.CREATED)
  async createLevel(@Body() dto: CreateLevelDto, @Request() req: any) {
    const tenantCode = req.tenantCode;
    const tenantId = await this.getTenantId(tenantCode);
    const level = await this.organizationService.createLevel(dto, tenantId, tenantCode);
    return {
      success: true,
      data: level,
      message: 'Organization level created successfully',
    };
  }

  /**
   * PATCH /api/org/levels/:id
   * Update an organization level
   */
  @Patch('levels/:id')
  async updateLevel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLevelDto,
    @Request() req: any,
  ) {
    const tenantCode = req.tenantCode;
    const tenantId = await this.getTenantId(tenantCode);
    const level = await this.organizationService.updateLevel(id, dto, tenantId, tenantCode);
    return {
      success: true,
      data: level,
      message: 'Organization level updated successfully',
    };
  }

  /**
   * DELETE /api/org/levels/:id
   * Delete an organization level
   */
  @Delete('levels/:id')
  async deleteLevel(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const tenantCode = req.tenantCode;
    const tenantId = await this.getTenantId(tenantCode);
    await this.organizationService.deleteLevel(id, tenantId, tenantCode);
    return {
      success: true,
      message: 'Organization level deleted successfully',
    };
  }

  // ============================================================
  // ORG UNITS ENDPOINTS
  // ============================================================

  /**
   * GET /org/tree
   * Get the complete organization tree
   */
  @Get('tree')
  async getTree(@Request() req: any) {
    this.logger.log(`[Controller.getTree] ===== Request received =====`);
    this.logger.log(`[Controller.getTree] Path: ${req.path}, Original URL: ${req.originalUrl}`);
    this.logger.log(`[Controller.getTree] Tenant code from request: ${req.tenantCode}`);
    
    const tenantCode = req.tenantCode;
    if (!tenantCode) {
      this.logger.error('[Controller.getTree] No tenantCode found in request');
      throw new Error('Tenant code not found');
    }
    
    const tenantId = await this.getTenantId(tenantCode);
    this.logger.log(`[Controller.getTree] Tenant ID resolved: ${tenantId}`);
    
    const tree = await this.organizationService.getTree(tenantId, tenantCode);
    
    this.logger.log(`[Controller.getTree] Service returned ${tree.length} root units`);
    this.logger.log(`[Controller.getTree] Tree structure:`, JSON.stringify(tree.map(u => ({ id: u.id, name: u.name, childrenCount: u.children?.length || 0 }))));
    
    return {
      success: true,
      data: tree,
    };
  }

  /**
   * GET /api/org/units/:id
   * Get organization unit details with children
   */
  @Get('units/:id')
  async getUnitDetails(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const tenantCode = req.tenantCode;
    const tenantId = await this.getTenantId(tenantCode);
    const unit = await this.organizationService.getUnitDetails(id, tenantId, tenantCode);
    return {
      success: true,
      data: unit,
    };
  }

  /**
   * POST /api/org/units
   * Create a new organization unit
   */
  @Post('units')
  @HttpCode(HttpStatus.CREATED)
  async createUnit(@Body() dto: CreateUnitDto, @Request() req: any) {
    const tenantCode = req.tenantCode;
    const tenantId = await this.getTenantId(tenantCode);
    const unit = await this.organizationService.createUnit(dto, tenantId, tenantCode);
    return {
      success: true,
      data: unit,
      message: 'Organization unit created successfully',
    };
  }

  /**
   * PATCH /api/org/units/:id
   * Update an organization unit
   */
  @Patch('units/:id')
  async updateUnit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUnitDto,
    @Request() req: any,
  ) {
    const tenantCode = req.tenantCode;
    const tenantId = await this.getTenantId(tenantCode);
    const unit = await this.organizationService.updateUnit(id, dto, tenantId, tenantCode);
    return {
      success: true,
      data: unit,
      message: 'Organization unit updated successfully',
    };
  }

  /**
   * DELETE /api/org/units/:id
   * Delete an organization unit
   */
  @Delete('units/:id')
  async deleteUnit(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const tenantCode = req.tenantCode;
    const tenantId = await this.getTenantId(tenantCode);
    await this.organizationService.deleteUnit(id, tenantId, tenantCode);
    return {
      success: true,
      message: 'Organization unit deleted successfully',
    };
  }

  // ============================================================
  // EMPLOYEE ASSIGNMENTS ENDPOINTS
  // ============================================================

  /**
   * POST /api/org/units/:id/employees
   * Assign an employee to an organization unit
   */
  @Post('units/:id/employees')
  @HttpCode(HttpStatus.CREATED)
  async assignEmployee(
    @Param('id', ParseIntPipe) unitId: number,
    @Body() body: { employeeId: string; isPrimary?: boolean },
    @Request() req: any,
  ) {
    const tenantCode = req.tenantCode;
    const tenantId = await this.getTenantId(tenantCode);
    await this.organizationService.assignEmployee(
      body.employeeId,
      unitId,
      tenantId,
      tenantCode,
      body.isPrimary || false,
    );
    return {
      success: true,
      message: 'Employee assigned to organization unit successfully',
    };
  }

  /**
   * DELETE /api/org/units/:id/employees/:employeeId
   * Remove an employee from an organization unit
   */
  @Delete('units/:id/employees/:employeeId')
  async removeEmployee(
    @Param('id', ParseIntPipe) unitId: number,
    @Param('employeeId') employeeId: string,
    @Request() req: any,
  ) {
    const tenantCode = req.tenantCode;
    const tenantId = await this.getTenantId(tenantCode);
    await this.organizationService.removeEmployee(employeeId, unitId, tenantId, tenantCode);
    return {
      success: true,
      message: 'Employee removed from organization unit successfully',
    };
  }

  /**
   * GET /api/org/units/:id/employees
   * List all employees assigned to an organization unit
   */
  @Get('units/:id/employees')
  async listEmployees(@Param('id', ParseIntPipe) unitId: number, @Request() req: any) {
    const tenantCode = req.tenantCode;
    const tenantId = await this.getTenantId(tenantCode);
    const employees = await this.organizationService.listEmployees(unitId, tenantId, tenantCode);
    return {
      success: true,
      data: employees,
    };
  }
}

