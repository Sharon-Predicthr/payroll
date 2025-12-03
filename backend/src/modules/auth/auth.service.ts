import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as sql from 'mssql';
import { AuditService } from './audit.service';

@Injectable()
export class AuthService {
  private controlPool: sql.ConnectionPool;

  constructor(
    private jwt: JwtService,
    private audit: AuditService,
  ) {}

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

  private async getConnectionPool(): Promise<sql.ConnectionPool> {
    if (!process.env.CONTROL_DB_URL) {
      throw new InternalServerErrorException('Database not configured. Please set CONTROL_DB_URL environment variable.');
    }

    // Check if pool exists and is connected
    if (this.controlPool && this.controlPool.connected) {
      return this.controlPool;
    }

    // Parse connection string and create pool
    const config = this.parseConnectionString(process.env.CONTROL_DB_URL);
    this.controlPool = new sql.ConnectionPool(config);

    try {
      await this.controlPool.connect();
      return this.controlPool;
    } catch (error) {
      this.controlPool = null;
      throw new InternalServerErrorException(`Failed to connect to database: ${error.message}`);
    }
  }

  async login(data: { email: string; password: string }, meta: any) {
    const pool = await this.getConnectionPool();

    const { email, password } = data;

    // 1. מציאת משתמש
    const userResult = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query(
        `SELECT * FROM app_users
         WHERE email = @email AND is_active = 1`
      );

    const user = userResult.recordset[0];

    if (!user) {
      await this.audit.logAttempt(email, false, 'User not found', meta);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. בדיקת סיסמה (אחרי זה תחליף ל-bcrypt)
    if (password !== user.password_hash) {
      await this.audit.logAttempt(email, false, 'Incorrect password', meta);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. מציאת ה-Tenants של המשתמש
    const tenantResult = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, user.id)
      .query(
        `SELECT t.*, l.role
         FROM tenants t
         JOIN tenant_user_links l ON l.tenant_id = t.id
         WHERE l.user_id = @userId AND t.is_active = 1`
      );

    if (tenantResult.recordset.length === 0) {
      await this.audit.logAttempt(email, false, 'No tenant assigned', meta);
      throw new UnauthorizedException('User not assigned to any tenant');
    }

    const tenant = tenantResult.recordset[0];

    await this.audit.logAttempt(email, true, 'Login OK', meta);

    // 4. יצירת JWT
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      tenantCode: tenant.code,
      role: tenant.role,
    });

    return {
      access_token: token,
      user: { id: user.id, email: user.email },
      tenant: { code: tenant.code, name: tenant.name },
    };
  }
}

