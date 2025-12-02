import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';

@Injectable()
export class TenantResolverService {
  private controlPool: sql.ConnectionPool;
  private tenantPools = new Map<string, sql.ConnectionPool>();

  constructor() {
    this.controlPool = new sql.ConnectionPool({
      connectionString: process.env.CONTROL_DB_URL,
      options: { trustServerCertificate: true },
    });
    this.controlPool.connect();
  }

  async getTenantPool(tenantCode: string): Promise<sql.ConnectionPool> {
    if (this.tenantPools.has(tenantCode)) {
      return this.tenantPools.get(tenantCode);
    }

    const result = await this.controlPool
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

