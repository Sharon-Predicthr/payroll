import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as sql from 'mssql';
import { AuditService } from './audit.service';

@Injectable()
export class AuthService {
  private controlPool: sql.ConnectionPool;

  constructor(
    private jwt: JwtService,
    private audit: AuditService,
  ) {
    this.controlPool = new sql.ConnectionPool({
      connectionString: process.env.CONTROL_DB_URL,
      options: { trustServerCertificate: true },
    });

    this.controlPool.connect();
  }

  async login(data: { email: string; password: string }, meta: any) {
    const { email, password } = data;

    // 1. מציאת משתמש
    const userResult = await this.controlPool
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
    const tenantResult = await this.controlPool
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

