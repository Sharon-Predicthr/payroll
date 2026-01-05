import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as sql from 'mssql';
import { TenantResolverService } from '../auth/tenant-resolver.service';

export interface LookupRequest {
  table: string;
  valueKey: string;
  labelKey: string;
  filter?: Record<string, any>;
  search?: string; // Search term for filtering results
  searchFields?: string[]; // Fields to search in (e.g., ['maske_name', 'sub_model'])
}

@Injectable()
export class LookupService {
  private readonly logger = new Logger(LookupService.name);

  constructor(private tenantResolver: TenantResolverService) {}

  async getLookup(
    tenantId: string,
    tenantCode: string,
    request: LookupRequest,
  ): Promise<any[]> {
    try {
      const pool = await this.tenantResolver.getTenantPool(tenantCode);
      if (!pool) {
        throw new BadRequestException('Failed to get database connection');
      }

      const { table, valueKey, labelKey, filter, search, searchFields } = request;

      // Validate table name to prevent SQL injection
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
        throw new BadRequestException('Invalid table name');
      }

      // Build WHERE clause from filter and search
      let whereClause = '';
      const requestObj = pool.request();
      const conditions: string[] = [];

      // Automatically add client_id filter for employees table to show only current tenant's employees
      if (table.toLowerCase() === 'employees') {
        // Check if client_id column exists in the table
        try {
          const columnCheck = await pool.request().query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'employees' AND COLUMN_NAME = 'client_id'
          `);
          
          if (columnCheck.recordset.length > 0) {
            // Add client_id filter using tenantCode
            const clientIdParam = 'autoclientid';
            conditions.push(`LTRIM(RTRIM(client_id)) = LTRIM(RTRIM(@${clientIdParam}))`);
            requestObj.input(clientIdParam, sql.NVarChar, tenantCode);
            this.logger.log(`[getLookup] Automatically added client_id filter for employees table: ${tenantCode}`);
          }
        } catch (checkError) {
          // If check fails, continue without client_id filter
          this.logger.warn(`[getLookup] Could not check for client_id column, skipping auto-filter`);
        }
      }

      // Add filter conditions
      if (filter && Object.keys(filter).length > 0) {
        Object.entries(filter).forEach(([key, value], index) => {
          // Validate column name
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
            throw new BadRequestException(`Invalid column name: ${key}`);
          }

          const paramName = `filter${index}`;
          conditions.push(`${key} = @${paramName}`);
          
          if (typeof value === 'string') {
            requestObj.input(paramName, sql.NVarChar, value);
          } else if (typeof value === 'number') {
            requestObj.input(paramName, sql.Int, value);
          } else if (typeof value === 'boolean') {
            requestObj.input(paramName, sql.Bit, value);
          } else {
            requestObj.input(paramName, sql.NVarChar, String(value));
          }
        });
      }

      // Add search conditions
      if (search && search.trim() && searchFields && searchFields.length > 0) {
        const searchConditions: string[] = [];
        searchFields.forEach((field, index) => {
          // Validate column name
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
            throw new BadRequestException(`Invalid search field name: ${field}`);
          }
          const paramName = `search${index}`;
          searchConditions.push(`${field} LIKE @${paramName}`);
          requestObj.input(paramName, sql.NVarChar, `%${search.trim()}%`);
        });
        if (searchConditions.length > 0) {
          conditions.push(`(${searchConditions.join(' OR ')})`);
        }
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      // Validate column names (allow computed columns like CONCAT(...))
      // For valueKey, it should be a simple column name
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(valueKey)) {
        throw new BadRequestException('Invalid value column name');
      }

      // For labelKey, it can be a simple column name or a computed expression like CONCAT(...)
      // We'll validate it's safe by checking it doesn't contain dangerous SQL keywords
      const dangerousKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE', '--', '/*', '*/'];
      const labelKeyUpper = labelKey.toUpperCase();
      for (const keyword of dangerousKeywords) {
        if (labelKeyUpper.includes(keyword)) {
          throw new BadRequestException('Invalid label column name');
        }
      }

      // Build query - return both code (valueKey) and description (labelKey) for display
      // If labelKey contains expressions (CONCAT, LTRIM, etc.), it's a computed column
      const isComputedColumn = labelKey.includes('(') || labelKey.includes('CONCAT') || labelKey.includes('LTRIM') || labelKey.includes('RTRIM') || labelKey.includes('+');
      
      // For computed columns, use the expression as-is in SELECT and alias it
      // Then use the alias in ORDER BY (computed columns can't be referenced directly in ORDER BY)
      const labelKeySelect = labelKey; // Use as-is, already contains the full expression
      const orderByColumn = isComputedColumn ? 'label' : labelKey; // Use alias for computed, original for simple
      
      const query = `
        SELECT 
          ${valueKey} AS value,
          ${valueKey} AS code,
          ${labelKeySelect} AS label,
          ${labelKeySelect} AS description,
          *
        FROM ${table}
        ${whereClause}
        ORDER BY ${orderByColumn}
      `;

      this.logger.log(`[getLookup] Executing query for table ${table}: ${query.substring(0, 100)}...`);

      const result = await requestObj.query(query);

      return result.recordset;
    } catch (error: any) {
      this.logger.error(`[getLookup] Error:`, error);
      throw new BadRequestException(
        error.message || 'Failed to fetch lookup data',
      );
    }
  }
}

