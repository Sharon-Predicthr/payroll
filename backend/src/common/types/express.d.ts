/**
 * Extend Express Request type to include custom properties
 */
import { Request } from 'express';
import * as sql from 'mssql';

declare module 'express' {
  interface Request {
    user?: {
      sub: string;
      email: string;
      tenantCode: string;
      role: string;
    };
    tenantPool?: sql.ConnectionPool;
    tenantCode?: string;
    tenantDbInfo?: string;
  }
}

