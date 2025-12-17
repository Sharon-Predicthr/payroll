import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TenantResolverService } from '../../modules/auth/tenant-resolver.service';

/**
 * Interceptor that adds tenant database connection info to responses
 * Only active when ENABLE_DB_INDICATOR=true in environment
 * 
 * Usage: Add to controller or globally in main.ts
 * @UseInterceptors(TenantDbIndicatorInterceptor)
 */
@Injectable()
export class TenantDbIndicatorInterceptor implements NestInterceptor {
  constructor(private tenantResolver: TenantResolverService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if indicator is enabled
    const isEnabled = process.env.ENABLE_DB_INDICATOR === 'true';
    
    if (!isEnabled) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const tenantCode = request.tenantCode;

    return next.handle().pipe(
      map((data) => {
        // Add DB connection info to response
        const response = context.switchToHttp().getResponse();
        
        // Check if response has already been sent (headersSent is true)
        // This happens when using @Res() decorator and res.send() directly
        if (response.headersSent) {
          // Response already sent, can't modify headers or body
          return data;
        }
        
        // Get tenant info if available
        if (tenantCode) {
          const tenantInfo = this.tenantResolver.getCachedTenantInfo(tenantCode);
          
          if (tenantInfo) {
            try {
              // Add to response headers (for easy inspection)
              // Only if headers haven't been sent yet
              if (!response.headersSent) {
                response.setHeader('X-Tenant-DB-Host', tenantInfo.db_host);
                response.setHeader('X-Tenant-DB-Name', tenantInfo.db_name);
                response.setHeader('X-Tenant-Code', tenantInfo.code);
              }
            } catch (error) {
              // Ignore errors if headers already sent
              // This can happen with @Res() decorator
            }
            
            // Add to response body if it's an object and response hasn't been sent
            // Skip if data is a Buffer (like PDF) or response already sent
            if (data && typeof data === 'object' && !Array.isArray(data) && !Buffer.isBuffer(data) && !response.headersSent) {
              return {
                ...data,
                _dbInfo: {
                  tenantCode: tenantInfo.code,
                  tenantName: tenantInfo.name,
                  dbHost: tenantInfo.db_host,
                  dbName: tenantInfo.db_name,
                  dbPort: tenantInfo.db_port,
                  dbUser: tenantInfo.db_user,
                  // Don't expose password
                },
              };
            }
          }
        }
        
        return data;
      }),
    );
  }
}

