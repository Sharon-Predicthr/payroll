
import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';

@Injectable()
export class AuditService {
  private pool: sql.ConnectionPool;

  constructor() {
    this.pool = new sql.ConnectionPool({
      connectionString: process.env.CONTROL_DB_URL,
      options: { trustServerCertificate: true },
    });

    this.pool.connect();
  }

  async logAttempt(
    email: string,
    success: boolean,
    reason: string,
    meta: { ip: string; userAgent: string }
  ) {
    await this.pool
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
