import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as sql from 'mssql';

export interface TenantConnectionInfo {
  code: string;
  name: string;
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_password_enc: string;
}

@Injectable()
export class TenantResolverService {
  private readonly logger = new Logger(TenantResolverService.name);
  private controlPool: sql.ConnectionPool;
  private tenantPools = new Map<string, sql.ConnectionPool>();
  private tenantInfoCache = new Map<string, TenantConnectionInfo>();

  private parseConnectionString(connectionString: string): any {
    const config: any = { options: { trustServerCertificate: true } };
    const parts = connectionString.split(';');
    
    for (const part of parts) {
      const [key, value] = part.split('=').map(s => s.trim());
      if (!key || !value) continue;
      
      switch (key.toLowerCase()) {
        case 'server':
          config.server = value;
          break;
        case 'database':
          config.database = value;
          break;
        case 'user id':
        case 'userid':
          config.user = value;
          break;
        case 'password':
          config.password = value;
          break;
        case 'port':
          config.port = parseInt(value);
          break;
        case 'trustservercertificate':
          config.options.trustServerCertificate = value.toLowerCase() === 'true';
          break;
      }
    }
    
    return config;
  }

  /**
   * Get or create control database connection pool
   */
  async ensureControlPool(): Promise<sql.ConnectionPool> {
    if (this.controlPool && this.controlPool.connected) {
      return this.controlPool;
    }

    if (!process.env.CONTROL_DB_URL) {
      throw new InternalServerErrorException(
        'Database not configured. Please set CONTROL_DB_URL environment variable.'
      );
    }

    try {
      const config = this.parseConnectionString(process.env.CONTROL_DB_URL);
      this.controlPool = new sql.ConnectionPool(config);
      await this.controlPool.connect();
      this.logger.log('Control database connection established');
      return this.controlPool;
    } catch (error) {
      this.controlPool = null;
      this.logger.error(`Failed to connect to control database: ${error.message}`);
      throw new InternalServerErrorException(
        `Failed to connect to control database: ${error.message}`
      );
    }
  }

  /**
   * Get tenant connection information from control database
   */
  async getTenantInfo(tenantCode: string): Promise<TenantConnectionInfo> {
    // Check cache first
    if (this.tenantInfoCache.has(tenantCode)) {
      return this.tenantInfoCache.get(tenantCode);
    }

    const controlPool = await this.ensureControlPool();
    
    try {
      const result = await controlPool
        .request()
        .input('code', sql.NVarChar, tenantCode)
        .query(
          `SELECT code, name, db_host, db_port, db_name, db_user, db_password_enc
           FROM tenants 
           WHERE code = @code AND is_active = 1`
        );

      if (result.recordset.length === 0) {
        throw new InternalServerErrorException(`Tenant with code '${tenantCode}' not found or inactive`);
      }

      const tenant = result.recordset[0];
      const tenantInfo: TenantConnectionInfo = {
        code: tenant.code,
        name: tenant.name,
        db_host: tenant.db_host,
        db_port: tenant.db_port,
        db_name: tenant.db_name,
        db_user: tenant.db_user,
        db_password_enc: tenant.db_password_enc,
      };

      // Cache tenant info
      this.tenantInfoCache.set(tenantCode, tenantInfo);
      return tenantInfo;
    } catch (error) {
      this.logger.error(`Failed to get tenant info for '${tenantCode}': ${error.message}`);
      throw error;
    }
  }

  /**
   * Get tenant pool by tenant ID (UUID)
   * Used by job scheduler when tenant_id is stored as UUID
   */
  async getTenantPoolById(tenantId: string): Promise<sql.ConnectionPool> {
    // First, get tenant code from tenant ID
    const controlPool = await this.ensureControlPool();
    try {
      const result = await controlPool
        .request()
        .input('id', sql.UniqueIdentifier, tenantId)
        .query('SELECT code FROM tenants WHERE id = @id AND is_active = 1');

      if (result.recordset.length === 0) {
        throw new InternalServerErrorException(`Tenant with ID '${tenantId}' not found or inactive`);
      }

      const tenantCode = result.recordset[0].code;
      return this.getTenantPool(tenantCode);
    } catch (error) {
      this.logger.error(`Failed to get tenant pool by ID '${tenantId}': ${error.message}`);
      throw error;
    }
  }

  /**
   * Get or create tenant database connection pool
   * This is the main method to get tenant connection after login
   */
  async getTenantPool(tenantCode: string): Promise<sql.ConnectionPool> {
    // Check if pool exists and is connected
    const existingPool = this.tenantPools.get(tenantCode);
    if (existingPool && existingPool.connected) {
      return existingPool;
    }

    // If pool exists but disconnected, remove it
    if (existingPool) {
      this.logger.warn(`Tenant pool for '${tenantCode}' was disconnected, reconnecting...`);
      this.tenantPools.delete(tenantCode);
    }

    // Get tenant connection info
    const tenantInfo = await this.getTenantInfo(tenantCode);

    // Create new connection pool
    try {
      const pool = new sql.ConnectionPool({
        server: tenantInfo.db_host,
        database: tenantInfo.db_name,
        user: tenantInfo.db_user,
        password: tenantInfo.db_password_enc,
        port: tenantInfo.db_port,
        options: {
          trustServerCertificate: true,
          encrypt: true,
          enableArithAbort: true,
        },
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000,
        },
      });

      await pool.connect();
      this.tenantPools.set(tenantCode, pool);
      this.logger.log(`Tenant database connection established for '${tenantCode}'`);

      // Handle connection errors
      pool.on('error', (err) => {
        this.logger.error(`Tenant pool error for '${tenantCode}': ${err.message}`);
        this.tenantPools.delete(tenantCode);
      });

      return pool;
    } catch (error) {
      this.logger.error(`Failed to connect to tenant database for '${tenantCode}': ${error.message}`);
      throw new InternalServerErrorException(
        `Failed to connect to tenant database: ${error.message}`
      );
    }
  }

  /**
   * Check if tenant connection is healthy
   */
  async isTenantConnectionHealthy(tenantCode: string): Promise<boolean> {
    try {
      const pool = await this.getTenantPool(tenantCode);
      const result = await pool.request().query('SELECT 1 as test');
      return result.recordset.length > 0;
    } catch (error) {
      this.logger.warn(`Tenant connection health check failed for '${tenantCode}': ${error.message}`);
      return false;
    }
  }

  /**
   * Close a specific tenant connection
   */
  async closeTenantConnection(tenantCode: string): Promise<void> {
    const pool = this.tenantPools.get(tenantCode);
    if (pool) {
      try {
        await pool.close();
        this.tenantPools.delete(tenantCode);
        this.tenantInfoCache.delete(tenantCode);
        this.logger.log(`Tenant connection closed for '${tenantCode}'`);
      } catch (error) {
        this.logger.error(`Error closing tenant connection for '${tenantCode}': ${error.message}`);
      }
    }
  }

  /**
   * Close all tenant connections (useful for graceful shutdown)
   */
  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.tenantPools.keys()).map(code =>
      this.closeTenantConnection(code)
    );
    await Promise.all(closePromises);

    if (this.controlPool && this.controlPool.connected) {
      try {
        await this.controlPool.close();
        this.logger.log('Control database connection closed');
      } catch (error) {
        this.logger.error(`Error closing control connection: ${error.message}`);
      }
    }
  }

  /**
   * Get tenant connection info (cached)
   */
  getCachedTenantInfo(tenantCode: string): TenantConnectionInfo | null {
    return this.tenantInfoCache.get(tenantCode) || null;
  }
}

