import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that logs tenant database connection info for each request
 * Only active when ENABLE_DB_INDICATOR=true in environment
 */
@Injectable()
export class TenantDbLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('TenantDB');

  use(req: Request, res: Response, next: NextFunction) {
    // Check if indicator is enabled
    const isEnabled = process.env.ENABLE_DB_INDICATOR === 'true';
    
    if (isEnabled && req.tenantCode) {
      const tenantCode = req.tenantCode;
      const method = req.method;
      const path = req.path;
      
      // Log at the end of request
      res.on('finish', () => {
        const statusCode = res.statusCode;
        const dbInfo = req.tenantDbInfo || 'N/A';
        
        this.logger.log(
          `[${method}] ${path} | Tenant: ${tenantCode} | DB: ${dbInfo} | Status: ${statusCode}`
        );
      });
    }
    
    next();
  }
}

