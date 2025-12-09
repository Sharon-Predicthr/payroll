import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as sql from 'mssql';

/**
 * Decorator to inject tenant database connection pool into controller methods
 * 
 * Usage:
 * @Get()
 * async getData(@TenantConnection() pool: sql.ConnectionPool) {
 *   const result = await pool.request().query('SELECT * FROM employees');
 *   return result.recordset;
 * }
 */
export const TenantConnection = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): sql.ConnectionPool => {
    const request = ctx.switchToHttp().getRequest();
    const tenantPool = request.tenantPool;
    
    if (!tenantPool) {
      throw new Error('Tenant connection not found. Ensure TenantConnectionGuard is applied.');
    }
    
    return tenantPool;
  },
);

