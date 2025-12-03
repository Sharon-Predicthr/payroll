import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';

@Injectable()
export class TenantResolverService {
  private controlPool: sql.ConnectionPool;
  private tenantPools = new Map<string, sql.ConnectionPool>();

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
      }
    }
    
    return config;
  }

  private async ensureControlPool() {
    if (this.controlPool && this.controlPool.connected) {
      return this.controlPool;
    }

    if (!process.env.CONTROL_DB_URL) {
      throw new Error('Database not configured. Please set CONTROL_DB_URL environment variable.');
    }

    const config = this.parseConnectionString(process.env.CONTROL_DB_URL);
    this.controlPool = new sql.ConnectionPool(config);
    await this.controlPool.connect();
    
    return this.controlPool;
  }

  async getTenantPool(tenantCode: string): Promise<sql.ConnectionPool> {
    if (this.tenantPools.has(tenantCode)) {
      return this.tenantPools.get(tenantCode);
    }

    const controlPool = await this.ensureControlPool();
    const result = await controlPool
      .request()
      .input('code', sql.NVarChar, tenantCode)
      .query(`SELECT * FROM tenants WHERE code = @code`);

    const tenant = result.recordset[0];

    const pool = new sql.ConnectionPool({
      server: tenant.db_host,
      database: tenant.db_name,
      user: tenant.db_user,
      password: tenant.db_password_enc, 
      port: tenant.db_port,
      options: { trustServerCertificate: true }
    });

    await pool.connect();
    this.tenantPools.set(tenantCode, pool);

    return pool;
  }
}

