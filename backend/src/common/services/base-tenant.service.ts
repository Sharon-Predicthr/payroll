import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { TenantResolverService } from '../../modules/auth/tenant-resolver.service';

/**
 * Base service that other services can extend to easily access tenant database
 * 
 * Usage:
 * @Injectable()
 * export class EmployeesService extends BaseTenantService {
 *   constructor(tenantResolver: TenantResolverService) {
 *     super(tenantResolver);
 *   }
 * 
 *   async getEmployees(tenantCode: string) {
 *     const pool = await this.getTenantPool(tenantCode);
 *     const result = await pool.request().query('SELECT * FROM employees');
 *     return result.recordset;
 *   }
 * }
 */
@Injectable()
export abstract class BaseTenantService {
  constructor(protected readonly tenantResolver: TenantResolverService) {}

  /**
   * Get tenant database connection pool
   */
  protected async getTenantPool(tenantCode: string): Promise<sql.ConnectionPool> {
    return this.tenantResolver.getTenantPool(tenantCode);
  }

  /**
   * Get tenant connection info
   */
  protected async getTenantInfo(tenantCode: string) {
    return this.tenantResolver.getTenantInfo(tenantCode);
  }

  /**
   * Check if tenant connection is healthy
   */
  protected async isConnectionHealthy(tenantCode: string): Promise<boolean> {
    return this.tenantResolver.isTenantConnectionHealthy(tenantCode);
  }
}

