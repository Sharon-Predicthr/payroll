
import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';

@Injectable()
export class AuditService {
  private pool: sql.ConnectionPool;

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

  private async ensurePool() {
    if (this.pool && this.pool.connected) {
      return this.pool;
    }

    if (!process.env.CONTROL_DB_URL) {
      console.warn('AuditService: Database not configured, skipping audit log');
      return null;
    }

    const config = this.parseConnectionString(process.env.CONTROL_DB_URL);
    this.pool = new sql.ConnectionPool(config);
    
    try {
      await this.pool.connect();
      return this.pool;
    } catch (error) {
      console.warn('AuditService: Failed to connect to database:', error.message);
      this.pool = null;
      return null;
    }
  }

  async logAttempt(
    email: string,
    success: boolean,
    reason: string,
    meta: { ip: string; userAgent: string }
  ) {
    const pool = await this.ensurePool();
    if (!pool) return; // Skip if database not configured
    
    await pool
      .request()
      .input('email', sql.NVarChar, email)
      .input('ip', sql.NVarChar, meta.ip)
      .input('ua', sql.NVarChar, meta.userAgent)
      .input('success', sql.Bit, success)
      .input('reason', sql.NVarChar, reason)
      .query(
        `INSERT INTO auth_audit_log (email, ip, user_agent, success, reason)
         VALUES (@email, @ip, @ua, @success, @reason)`
      );
  }
}
