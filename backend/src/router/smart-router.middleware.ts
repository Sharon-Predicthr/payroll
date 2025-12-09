import { Injectable, NestMiddleware, Logger, InternalServerErrorException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as sql from 'mssql';
import { isControlRoute, isTenantRoute, getRouteType } from './route-map';

/**
 * Smart Router Middleware
 * 
 * This middleware determines whether a route should use the Control DB or Tenant DB
 * and attaches the appropriate connection pool to the request object.
 * 
 * Note: For tenant routes, the TenantConnectionGuard will handle getting the tenant pool.
 * This middleware primarily handles control routes and route classification.
 */
@Injectable()
export class SmartRouterMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SmartRouterMiddleware.name);
  private controlPool: sql.ConnectionPool;

  async use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;
    const routeType = getRouteType(path);

    this.logger.debug(`[SmartRouter] Route: ${path}, Type: ${routeType}`);

    try {
      if (routeType === 'control') {
        // Use Control DB
        const controlPool = await this.getControlPool();
        (req as any).dbPool = controlPool;
        (req as any).dbType = 'control';
        this.logger.debug(`[SmartRouter] Attached Control DB pool to request`);
      } else if (routeType === 'tenant') {
        // Tenant routes - TenantConnectionGuard will handle getting the tenant pool
        // Just mark the route type
        const tenantCode = this.extractTenantCode(req);
        (req as any).dbType = 'tenant';
        if (tenantCode) {
          (req as any).tenantCode = tenantCode;
          this.logger.debug(`[SmartRouter] Tenant route detected for tenant: ${tenantCode}`);
        } else {
          this.logger.debug(`[SmartRouter] Tenant route detected, tenantCode will be extracted by guard`);
        }
      } else {
        // Unknown route - mark as unknown, let guards handle it
        const tenantCode = this.extractTenantCode(req);
        (req as any).dbType = 'unknown';
        if (tenantCode) {
          (req as any).tenantCode = tenantCode;
        }
        this.logger.debug(`[SmartRouter] Unknown route type, will be handled by guards`);
      }

      next();
    } catch (error) {
      this.logger.error(`[SmartRouter] Error setting up database connection: ${error.message}`);
      next(error);
    }
  }

  /**
   * Extract tenant code from JWT token in request
   */
  private extractTenantCode(req: Request): string | null {
    // Check if user is already attached (by AuthGuard)
    if (req.user && (req.user as any).tenantCode) {
      return (req.user as any).tenantCode;
    }

    // Try to extract from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        // Decode JWT without verification (just to get tenantCode)
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return payload.tenantCode || null;
      } catch (error) {
        this.logger.debug(`[SmartRouter] Failed to extract tenantCode from token: ${error.message}`);
        return null;
      }
    }

    return null;
  }

  /**
   * Get Control DB connection pool
   */
  private async getControlPool(): Promise<sql.ConnectionPool> {
    // Reuse existing pool if available and connected
    if (this.controlPool && this.controlPool.connected) {
      return this.controlPool;
    }

    if (!process.env.CONTROL_DB_URL) {
      throw new InternalServerErrorException(
        'Database not configured. Please set CONTROL_DB_URL environment variable.'
      );
    }

    // Create new pool
    const config = this.parseConnectionString(process.env.CONTROL_DB_URL);
    this.controlPool = new sql.ConnectionPool(config);
    
    try {
      await this.controlPool.connect();
      this.logger.log('[SmartRouter] Control DB pool connected');
      return this.controlPool;
    } catch (error) {
      this.controlPool = null;
      this.logger.error(`[SmartRouter] Failed to connect to control database: ${error.message}`);
      throw new InternalServerErrorException(
        `Failed to connect to control database: ${error.message}`
      );
    }
  }

  /**
   * Parse connection string
   */
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
}

