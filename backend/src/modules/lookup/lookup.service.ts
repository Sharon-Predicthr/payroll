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

      // Validate column names
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(valueKey) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(labelKey)) {
        throw new BadRequestException('Invalid column name');
      }

      // Build query - return both code (valueKey) and description (labelKey) for display
      const query = `
        SELECT 
          ${valueKey} AS value,
          ${valueKey} AS code,
          ${labelKey} AS label,
          ${labelKey} AS description,
          *
        FROM ${table}
        ${whereClause}
        ORDER BY ${labelKey}
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

