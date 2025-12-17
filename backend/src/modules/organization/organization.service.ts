import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { BaseTenantService } from '../../common/services/base-tenant.service';
import { TenantResolverService } from '../auth/tenant-resolver.service';
import * as sql from 'mssql';
import { OrgLevel } from './interfaces/org-level.interface';
import { OrgUnit, OrgUnitTree } from './interfaces/org-unit.interface';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class OrganizationService extends BaseTenantService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(tenantResolver: TenantResolverService) {
    super(tenantResolver);
  }

  /**
   * Get tenant database pool from request context or tenantCode
   */
  private async getPool(tenantCode: string): Promise<sql.ConnectionPool> {
    return this.getTenantPool(tenantCode);
  }

  // ============================================================
  // ORG LEVELS CRUD
  // ============================================================

  async createLevel(dto: CreateLevelDto, tenantId: string, tenantCode: string): Promise<OrgLevel> {
    const pool = await this.getPool(tenantCode);

    try {
      const result = await pool
        .request()
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .input('key', sql.NVarChar(50), dto.key)
        .input('display_name', sql.NVarChar(100), dto.display_name)
        .input('level_order', sql.Int, dto.level_order)
        .input('is_active', sql.Bit, dto.is_active !== false)
        .query(`
          INSERT INTO org_levels (tenant_id, [key], display_name, level_order, is_active)
          OUTPUT INSERTED.*
          VALUES (@tenant_id, @key, @display_name, @level_order, @is_active)
        `);

      return this.mapToLevel(result.recordset[0]);
    } catch (error) {
      if (error.number === 2627) {
        // Unique constraint violation
        throw new BadRequestException(
          `Level with key '${dto.key}' or order ${dto.level_order} already exists for this tenant`
        );
      }
      this.logger.error(`Failed to create level: ${error.message}`);
      throw new InternalServerErrorException(`Failed to create level: ${error.message}`);
    }
  }

  async updateLevel(
    id: number,
    dto: UpdateLevelDto,
    tenantId: string,
    tenantCode: string
  ): Promise<OrgLevel> {
    const pool = await this.getPool(tenantCode);

    try {
      const existing = await this.getLevelById(id, tenantId, tenantCode);
      if (!existing) {
        throw new NotFoundException(`Level with ID ${id} not found`);
      }

      const updates: string[] = [];
      const request = pool.request().input('id', sql.BigInt, id).input('tenant_id', sql.UniqueIdentifier, tenantId);

      if (dto.key !== undefined) {
        updates.push('[key] = @key');
        request.input('key', sql.NVarChar(50), dto.key);
      }
      if (dto.display_name !== undefined) {
        updates.push('display_name = @display_name');
        request.input('display_name', sql.NVarChar(100), dto.display_name);
      }
      if (dto.level_order !== undefined) {
        updates.push('level_order = @level_order');
        request.input('level_order', sql.Int, dto.level_order);
      }
      if (dto.is_active !== undefined) {
        updates.push('is_active = @is_active');
        request.input('is_active', sql.Bit, dto.is_active);
      }

      if (updates.length === 0) {
        return existing;
      }

      const result = await request.query(`
        UPDATE org_levels
        SET ${updates.join(', ')}
        OUTPUT INSERTED.*
        WHERE id = @id AND tenant_id = @tenant_id
      `);

      if (result.recordset.length === 0) {
        throw new NotFoundException(`Level with ID ${id} not found`);
      }

      return this.mapToLevel(result.recordset[0]);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.number === 2627) {
        throw new BadRequestException('Level with this key or order already exists');
      }
      this.logger.error(`Failed to update level: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update level: ${error.message}`);
    }
  }

  async listLevels(tenantId: string, tenantCode: string): Promise<OrgLevel[]> {
    const pool = await this.getPool(tenantCode);

    try {
      const result = await pool
        .request()
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query(`
          SELECT *
          FROM org_levels
          WHERE tenant_id = @tenant_id
          ORDER BY level_order ASC
        `);

      return result.recordset.map(row => this.mapToLevel(row));
    } catch (error) {
      this.logger.error(`Failed to list levels: ${error.message}`);
      throw new InternalServerErrorException(`Failed to list levels: ${error.message}`);
    }
  }

  async deleteLevel(id: number, tenantId: string, tenantCode: string): Promise<void> {
    const pool = await this.getPool(tenantCode);

    try {
      // Get the level_key first
      const levelResult = await pool
        .request()
        .input('id', sql.BigInt, id)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query('SELECT [key] FROM org_levels WHERE id = @id AND tenant_id = @tenant_id');

      if (levelResult.recordset.length === 0) {
        throw new NotFoundException(`Level with ID ${id} not found`);
      }

      const levelKey = levelResult.recordset[0].key;

      // Check if level is in use
      const inUseCheck = await pool
        .request()
        .input('level_key', sql.NVarChar(50), levelKey)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query(`
          SELECT COUNT(*) as count
          FROM org_units
          WHERE tenant_id = @tenant_id AND level_key = @level_key
        `);

      if (inUseCheck.recordset[0].count > 0) {
        throw new BadRequestException(
          `Cannot delete level: it is in use by ${inUseCheck.recordset[0].count} organization unit(s)`
        );
      }

      const deleteResult = await pool
        .request()
        .input('id', sql.BigInt, id)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query('DELETE FROM org_levels WHERE id = @id AND tenant_id = @tenant_id');

      if (deleteResult.rowsAffected[0] === 0) {
        throw new NotFoundException(`Level with ID ${id} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to delete level: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete level: ${error.message}`);
    }
  }

  async getLevelById(id: number, tenantId: string, tenantCode: string): Promise<OrgLevel | null> {
    const pool = await this.getPool(tenantCode);

    try {
      const result = await pool
        .request()
        .input('id', sql.BigInt, id)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query('SELECT * FROM org_levels WHERE id = @id AND tenant_id = @tenant_id');

      if (result.recordset.length === 0) {
        return null;
      }

      return this.mapToLevel(result.recordset[0]);
    } catch (error) {
      this.logger.error(`Failed to get level: ${error.message}`);
      throw new InternalServerErrorException(`Failed to get level: ${error.message}`);
    }
  }

  async getLevelByKey(key: string, tenantId: string, tenantCode: string): Promise<OrgLevel | null> {
    const pool = await this.getPool(tenantCode);

    try {
      const result = await pool
        .request()
        .input('key', sql.NVarChar(50), key)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query('SELECT * FROM org_levels WHERE [key] = @key AND tenant_id = @tenant_id AND is_active = 1');

      if (result.recordset.length === 0) {
        return null;
      }

      return this.mapToLevel(result.recordset[0]);
    } catch (error) {
      this.logger.error(`Failed to get level by key: ${error.message}`);
      throw new InternalServerErrorException(`Failed to get level by key: ${error.message}`);
    }
  }

  // ============================================================
  // ORG UNITS CRUD
  // ============================================================

  async createUnit(dto: CreateUnitDto, tenantId: string, tenantCode: string): Promise<OrgUnit> {
    const pool = await this.getPool(tenantCode);

    try {
      // Validate level exists and is active
      const level = await this.getLevelByKey(dto.level_key, tenantId, tenantCode);
      if (!level) {
        throw new BadRequestException(`Level with key '${dto.level_key}' not found or inactive`);
      }

      // Validate parent if provided
      if (dto.parent_id !== null && dto.parent_id !== undefined) {
        const parent = await this.getUnitById(dto.parent_id, tenantId, tenantCode);
        if (!parent) {
          throw new NotFoundException(`Parent unit with ID ${dto.parent_id} not found`);
        }

        // Validate parent belongs to previous level
        const parentLevel = await this.getLevelByKey(parent.level_key, tenantId, tenantCode);
        if (!parentLevel || parentLevel.level_order >= level.level_order) {
          throw new BadRequestException(
            `Parent unit must belong to a level with order less than ${level.level_order}`
          );
        }
      } else {
        // Root units must be level 1
        if (level.level_order !== 1) {
          throw new BadRequestException('Root units must belong to level 1');
        }
      }

      const result = await pool
        .request()
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .input('level_key', sql.NVarChar(50), dto.level_key)
        .input('parent_id', sql.BigInt, dto.parent_id || null)
        .input('name', sql.NVarChar(200), dto.name)
        .input('code', sql.NVarChar(50), dto.code)
        .input('is_active', sql.Bit, dto.is_active !== false)
        .query(`
          INSERT INTO org_units (tenant_id, level_key, parent_id, name, code, is_active)
          OUTPUT INSERTED.*
          VALUES (@tenant_id, @level_key, @parent_id, @name, @code, @is_active)
        `);

      return this.mapToUnit(result.recordset[0]);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error.number === 2627) {
        throw new BadRequestException(`Unit with code '${dto.code}' already exists for this tenant`);
      }
      this.logger.error(`Failed to create unit: ${error.message}`);
      throw new InternalServerErrorException(`Failed to create unit: ${error.message}`);
    }
  }

  async updateUnit(
    id: number,
    dto: UpdateUnitDto,
    tenantId: string,
    tenantCode: string
  ): Promise<OrgUnit> {
    const pool = await this.getPool(tenantCode);

    try {
      const existing = await this.getUnitById(id, tenantId, tenantCode);
      if (!existing) {
        throw new NotFoundException(`Unit with ID ${id} not found`);
      }

      // Validate level if changed
      if (dto.level_key !== undefined) {
        const level = await this.getLevelByKey(dto.level_key, tenantId, tenantCode);
        if (!level) {
          throw new BadRequestException(`Level with key '${dto.level_key}' not found or inactive`);
        }
      }

      // Validate parent if changed
      if (dto.parent_id !== undefined) {
        if (dto.parent_id !== null) {
          const parent = await this.getUnitById(dto.parent_id, tenantId, tenantCode);
          if (!parent) {
            throw new NotFoundException(`Parent unit with ID ${dto.parent_id} not found`);
          }

          const levelKey = dto.level_key || existing.level_key;
          const level = await this.getLevelByKey(levelKey, tenantId, tenantCode);
          const parentLevel = await this.getLevelByKey(parent.level_key, tenantId, tenantCode);

          if (!parentLevel || parentLevel.level_order >= level.level_order) {
            throw new BadRequestException(
              `Parent unit must belong to a level with order less than ${level.level_order}`
            );
          }
        }
      }

      const updates: string[] = [];
      const request = pool.request().input('id', sql.BigInt, id).input('tenant_id', sql.UniqueIdentifier, tenantId);

      if (dto.level_key !== undefined) {
        updates.push('level_key = @level_key');
        request.input('level_key', sql.NVarChar(50), dto.level_key);
      }
      if (dto.parent_id !== undefined) {
        updates.push('parent_id = @parent_id');
        request.input('parent_id', sql.BigInt, dto.parent_id || null);
      }
      if (dto.name !== undefined) {
        updates.push('name = @name');
        request.input('name', sql.NVarChar(200), dto.name);
      }
      if (dto.code !== undefined) {
        updates.push('code = @code');
        request.input('code', sql.NVarChar(50), dto.code);
      }
      if (dto.is_active !== undefined) {
        updates.push('is_active = @is_active');
        request.input('is_active', sql.Bit, dto.is_active);
      }

      if (updates.length === 0) {
        return existing;
      }

      updates.push('updated_at = SYSUTCDATETIME()');

      const result = await request.query(`
        UPDATE org_units
        SET ${updates.join(', ')}
        OUTPUT INSERTED.*
        WHERE id = @id AND tenant_id = @tenant_id
      `);

      if (result.recordset.length === 0) {
        throw new NotFoundException(`Unit with ID ${id} not found`);
      }

      return this.mapToUnit(result.recordset[0]);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.number === 2627) {
        throw new BadRequestException('Unit with this code already exists');
      }
      this.logger.error(`Failed to update unit: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update unit: ${error.message}`);
    }
  }

  async deleteUnit(id: number, tenantId: string, tenantCode: string): Promise<void> {
    const pool = await this.getPool(tenantCode);

    try {
      // Check if unit has children
      const childrenResult = await pool
        .request()
        .input('parent_id', sql.BigInt, id)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query('SELECT COUNT(*) as count FROM org_units WHERE parent_id = @parent_id AND tenant_id = @tenant_id');

      if (childrenResult.recordset[0].count > 0) {
        throw new BadRequestException(
          `Cannot delete unit: it has ${childrenResult.recordset[0].count} child unit(s)`
        );
      }

      // Check if unit has employees assigned
      const employeesResult = await pool
        .request()
        .input('org_unit_id', sql.BigInt, id)
        .query(`
          SELECT COUNT(*) as count
          FROM employee_org_assignment
          WHERE org_unit_id = @org_unit_id
            AND (valid_to IS NULL OR valid_to >= GETDATE())
        `);

      if (employeesResult.recordset[0].count > 0) {
        throw new BadRequestException(
          `Cannot delete unit: it has ${employeesResult.recordset[0].count} active employee assignment(s)`
        );
      }

      const deleteResult = await pool
        .request()
        .input('id', sql.BigInt, id)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query('DELETE FROM org_units WHERE id = @id AND tenant_id = @tenant_id');

      if (deleteResult.rowsAffected[0] === 0) {
        throw new NotFoundException(`Unit with ID ${id} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to delete unit: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete unit: ${error.message}`);
    }
  }

  async getUnitById(id: number, tenantId: string, tenantCode: string): Promise<OrgUnit | null> {
    const pool = await this.getPool(tenantCode);

    try {
      const result = await pool
        .request()
        .input('id', sql.BigInt, id)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query('SELECT * FROM org_units WHERE id = @id AND tenant_id = @tenant_id');

      if (result.recordset.length === 0) {
        return null;
      }

      return this.mapToUnit(result.recordset[0]);
    } catch (error) {
      this.logger.error(`Failed to get unit: ${error.message}`);
      throw new InternalServerErrorException(`Failed to get unit: ${error.message}`);
    }
  }

  async getUnitDetails(id: number, tenantId: string, tenantCode: string): Promise<OrgUnitTree> {
    const unit = await this.getUnitById(id, tenantId, tenantCode);
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    const level = await this.getLevelByKey(unit.level_key, tenantId, tenantCode);
    const children = await this.getChildren(id, tenantId, tenantCode);

    return {
      ...unit,
      level: level?.display_name,
      children: children.length > 0 ? children : undefined,
    };
  }

  async getChildren(parentId: number, tenantId: string, tenantCode: string): Promise<OrgUnitTree[]> {
    const pool = await this.getPool(tenantCode);

    try {
      const result = await pool
        .request()
        .input('parent_id', sql.BigInt, parentId)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query(`
          SELECT ou.*, ol.display_name as level
          FROM org_units ou
          LEFT JOIN org_levels ol ON ou.level_key = ol.[key] AND ou.tenant_id = ol.tenant_id
          WHERE ou.parent_id = @parent_id AND ou.tenant_id = @tenant_id
          ORDER BY ou.name ASC
        `);

      this.logger.log(`[getChildren] Found ${result.recordset.length} children for parent ${parentId}`);
      
      // Log all children being returned
      if (result.recordset.length > 0) {
        this.logger.log(`[getChildren] Children for parent ${parentId}:`, result.recordset.map(r => ({
          id: r.id,
          name: r.name,
          code: r.code,
          parent_id: r.parent_id,
          level_key: r.level_key
        })));
        
        // Check for specific problematic unit
        const pituachUnit = result.recordset.find(r => r.id === 5 || r.name === "פיתוח");
        if (pituachUnit) {
          this.logger.error(`[getChildren] ⚠️ FOUND UNIT ID:5 or 'פיתוח' in database query!`);
          this.logger.error(`[getChildren] Unit details:`, {
            id: pituachUnit.id,
            name: pituachUnit.name,
            code: pituachUnit.code,
            parent_id: pituachUnit.parent_id,
            level_key: pituachUnit.level_key,
            tenant_id: pituachUnit.tenant_id
          });
        }
      }

      const children = result.recordset.map(row => ({
        ...this.mapToUnit(row),
        level: row.level || 'Unknown',
        children: undefined, // Will be populated if needed
      }));

      // Recursively get children
      for (const child of children) {
        const grandChildren = await this.getChildren(child.id, tenantId, tenantCode);
        if (grandChildren.length > 0) {
          child.children = grandChildren;
        }
      }

      return children;
    } catch (error) {
      this.logger.error(`Failed to get children: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to get children: ${error.message}`);
    }
  }

  async getTree(tenantId: string, tenantCode: string): Promise<OrgUnitTree[]> {
    const pool = await this.getPool(tenantCode);

    try {
      this.logger.log(`[getTree] ===== START getTree for tenant: ${tenantCode} (${tenantId}) =====`);
      
      // First, let's check if there are ANY units at all (without tenant filter to debug)
      const countAllResult = await pool
        .request()
        .query(`SELECT COUNT(*) as total FROM org_units`);
      
      this.logger.log(`[getTree] Total units in org_units table (all tenants): ${countAllResult.recordset[0]?.total || 0}`);
      this.logger.log(`[getTree] Looking for tenant_id: ${tenantId} (type: ${typeof tenantId})`);
      
      // Check what tenant_ids actually exist in the table
      const tenantIdsResult = await pool
        .request()
        .query(`SELECT DISTINCT tenant_id, COUNT(*) as count FROM org_units GROUP BY tenant_id`);
      
      this.logger.log(`[getTree] Tenant IDs in org_units table:`, tenantIdsResult.recordset.map(r => ({
        tenant_id: r.tenant_id,
        count: r.count
      })));
      
      // Now check with the specific tenant_id
      const countResult = await pool
        .request()
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query(`SELECT COUNT(*) as total FROM org_units WHERE tenant_id = @tenant_id`);
      
      const totalCount = countResult.recordset[0]?.total || 0;
      this.logger.log(`[getTree] Total units for tenant ${tenantCode} (${tenantId}): ${totalCount}`);
      
      if (totalCount === 0) {
        this.logger.warn(`[getTree] ⚠️ No units found for tenant ${tenantCode} (${tenantId})`);
        
        // Try without tenant filter to see if there are any units at all
        const allUnitsNoFilter = await pool
          .request()
          .query(`SELECT TOP 10 * FROM org_units ORDER BY id DESC`);
        
        this.logger.log(`[getTree] Found ${allUnitsNoFilter.recordset.length} units in table (ignoring tenant filter)`);
        
        if (allUnitsNoFilter.recordset.length > 0) {
          this.logger.log(`[getTree] 📋 Sample units from database:`);
          allUnitsNoFilter.recordset.forEach((r, idx) => {
            const dbTenantId = String(r.tenant_id);
            const searchTenantId = String(tenantId);
            const matches = dbTenantId.toLowerCase() === searchTenantId.toLowerCase();
            
            this.logger.log(`[getTree] Unit ${idx + 1}: ID=${r.id}, Name="${r.name}", Code="${r.code}"`);
            this.logger.log(`[getTree]   DB tenant_id: ${dbTenantId}`);
            this.logger.log(`[getTree]   Search tenant_id: ${searchTenantId}`);
            this.logger.log(`[getTree]   Match: ${matches ? '✅ YES' : '❌ NO'}`);
            this.logger.log(`[getTree]   parent_id: ${r.parent_id}, level_key: ${r.level_key}`);
          });
          
          // TEMPORARY: Return ALL units as root units for debugging (ignore tenant_id mismatch)
          this.logger.warn(`[getTree] 🔧 DEBUG MODE: Returning ALL units as root units (ignoring tenant_id)`);
          const debugUnits = allUnitsNoFilter.recordset
            .filter(row => row.parent_id === null || row.parent_id === undefined)
            .map(row => {
              const unit = {
                ...this.mapToUnit(row),
                level: 'Unknown',
                children: undefined,
              };
              this.logger.log(`[getTree] Adding debug unit: ${unit.name} (ID: ${unit.id})`);
              return unit;
            });
          
          this.logger.log(`[getTree] Returning ${debugUnits.length} debug units`);
          return debugUnits;
        }
        
        this.logger.warn(`[getTree] No units found in database at all`);
        return [];
      }
      
      // Get ALL units to see what we have
      const allUnitsResult = await pool
        .request()
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query(`
          SELECT ou.*, ol.display_name as level
          FROM org_units ou
          LEFT JOIN org_levels ol ON ou.level_key = ol.[key] AND ou.tenant_id = ol.tenant_id
          WHERE ou.tenant_id = @tenant_id
          ORDER BY CASE WHEN ou.parent_id IS NULL THEN 0 ELSE 1 END, ou.name ASC
        `);
      
      // Check specifically for unit ID 5
      const unit5 = allUnitsResult.recordset.find(r => r.id === 5);
      if (unit5) {
        this.logger.error(`[getTree] ⚠️ FOUND UNIT ID:5 in database!`);
        this.logger.error(`[getTree] Unit 5 details:`, {
          id: unit5.id,
          name: unit5.name,
          code: unit5.code,
          parent_id: unit5.parent_id,
          level_key: unit5.level_key,
          tenant_id: unit5.tenant_id,
          is_active: unit5.is_active
        });
      } else {
        this.logger.log(`[getTree] ✅ Unit ID:5 NOT found in database query results`);
      }
      
      // Log all IDs to see what we have
      const allIds = allUnitsResult.recordset.map(r => r.id).sort((a, b) => a - b);
      this.logger.log(`[getTree] All unit IDs in database:`, allIds);

      this.logger.log(`[getTree] Query returned ${allUnitsResult.recordset.length} rows`);
      
      if (allUnitsResult.recordset.length > 0) {
        this.logger.log(`[getTree] First unit sample:`, JSON.stringify({
          id: allUnitsResult.recordset[0].id,
          name: allUnitsResult.recordset[0].name,
          code: allUnitsResult.recordset[0].code,
          parent_id: allUnitsResult.recordset[0].parent_id,
          level_key: allUnitsResult.recordset[0].level_key,
        }));
      }

      // Get all root units (parent_id IS NULL)
      const rootUnits: OrgUnitTree[] = allUnitsResult.recordset
        .filter(row => row.parent_id === null || row.parent_id === undefined)
        .map(row => {
          const unit = {
            ...this.mapToUnit(row),
            level: row.level || 'Unknown',
            children: undefined,
          };
          this.logger.log(`[getTree] Mapped root unit: ${unit.name} (ID: ${unit.id}, parent_id: ${row.parent_id})`);
          return unit;
        });

      this.logger.log(`[getTree] Found ${rootUnits.length} root units after filtering`);

      // Recursively build tree
      for (const root of rootUnits) {
        const children = await this.getChildren(root.id, tenantId, tenantCode);
        if (children.length > 0) {
          root.children = children;
        }
      }

      this.logger.log(`[getTree] ===== END getTree - Returning ${rootUnits.length} root units =====`);
      return rootUnits;
    } catch (error) {
      this.logger.error(`[getTree] Failed to get tree: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to get tree: ${error.message}`);
    }
  }

  // ============================================================
  // EMPLOYEE ASSIGNMENTS
  // ============================================================

  async assignEmployee(
    employeeId: string,
    unitId: number,
    tenantId: string,
    tenantCode: string,
    isPrimary: boolean = false
  ): Promise<void> {
    const pool = await this.getPool(tenantCode);

    try {
      // Validate unit exists
      const unit = await this.getUnitById(unitId, tenantId, tenantCode);
      if (!unit) {
        throw new NotFoundException(`Unit with ID ${unitId} not found`);
      }

      // If setting as primary, unset other primary assignments
      if (isPrimary) {
        await pool
          .request()
          .input('employee_id', sql.UniqueIdentifier, employeeId)
          .query(`
            UPDATE employee_org_assignment
            SET is_primary = 0
            WHERE employee_id = @employee_id
          `);
      }

      // Insert or update assignment
      await pool
        .request()
        .input('employee_id', sql.UniqueIdentifier, employeeId)
        .input('org_unit_id', sql.BigInt, unitId)
        .input('is_primary', sql.Bit, isPrimary)
        .query(`
          MERGE employee_org_assignment AS target
          USING (SELECT @employee_id as employee_id, @org_unit_id as org_unit_id) AS source
          ON target.employee_id = source.employee_id AND target.org_unit_id = source.org_unit_id
          WHEN MATCHED THEN
            UPDATE SET is_primary = @is_primary, valid_from = GETDATE(), valid_to = NULL
          WHEN NOT MATCHED THEN
            INSERT (employee_id, org_unit_id, is_primary, valid_from, valid_to)
            VALUES (@employee_id, @org_unit_id, @is_primary, GETDATE(), NULL);
        `);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to assign employee: ${error.message}`);
      throw new InternalServerErrorException(`Failed to assign employee: ${error.message}`);
    }
  }

  async removeEmployee(
    employeeId: string,
    unitId: number,
    tenantId: string,
    tenantCode: string
  ): Promise<void> {
    const pool = await this.getPool(tenantCode);

    try {
      // Soft delete by setting valid_to
      const result = await pool
        .request()
        .input('employee_id', sql.UniqueIdentifier, employeeId)
        .input('org_unit_id', sql.BigInt, unitId)
        .query(`
          UPDATE employee_org_assignment
          SET valid_to = GETDATE()
          WHERE employee_id = @employee_id
            AND org_unit_id = @org_unit_id
            AND (valid_to IS NULL OR valid_to > GETDATE())
        `);

      if (result.rowsAffected[0] === 0) {
        throw new NotFoundException('Employee assignment not found or already removed');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to remove employee: ${error.message}`);
      throw new InternalServerErrorException(`Failed to remove employee: ${error.message}`);
    }
  }

  async listEmployees(unitId: number, tenantId: string, tenantCode: string): Promise<any[]> {
    const pool = await this.getPool(tenantCode);

    try {
      const result = await pool
        .request()
        .input('org_unit_id', sql.BigInt, unitId)
        .query(`
          SELECT 
            eoa.employee_id,
            eoa.is_primary,
            eoa.valid_from,
            eoa.valid_to,
            e.employee_code,
            e.first_name,
            e.last_name,
            e.email,
            e.status
          FROM employee_org_assignment eoa
          LEFT JOIN employees e ON eoa.employee_id = e.employee_id
          WHERE eoa.org_unit_id = @org_unit_id
            AND (eoa.valid_to IS NULL OR eoa.valid_to >= GETDATE())
          ORDER BY eoa.is_primary DESC, e.last_name ASC, e.first_name ASC
        `);

      return result.recordset;
    } catch (error) {
      this.logger.error(`Failed to list employees: ${error.message}`);
      throw new InternalServerErrorException(`Failed to list employees: ${error.message}`);
    }
  }

  // ============================================================
  // MAPPERS
  // ============================================================

  private mapToLevel(row: any): OrgLevel {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      key: row.key,
      display_name: row.display_name,
      level_order: row.level_order,
      is_active: row.is_active === 1 || row.is_active === true,
      created_at: row.created_at,
    };
  }

  private mapToUnit(row: any): OrgUnit {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      level_key: row.level_key,
      parent_id: row.parent_id,
      name: row.name,
      code: row.code,
      is_active: row.is_active === 1 || row.is_active === true,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

