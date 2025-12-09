import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { TenantResolverService } from '../../modules/auth/tenant-resolver.service';

/**
 * Guard that extracts tenant code from JWT and injects tenant database connection
 * into the request object for use in controllers
 * 
 * Usage:
 * @UseGuards(AuthGuard('jwt'), TenantConnectionGuard)
 * @Get()
 * async getData(@TenantConnection() pool: sql.ConnectionPool) {
 *   // Use pool to query tenant database
 * }
 */
@Injectable()
export class TenantConnectionGuard implements CanActivate {
  constructor(private tenantResolver: TenantResolverService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    console.log('[TenantConnectionGuard] canActivate called');
    console.log('[TenantConnectionGuard] Request user:', request.user);
    console.log('[TenantConnectionGuard] Request path:', request.path);
    
    // Extract tenant code from JWT payload (set by JwtStrategy)
    const user = request.user;
    
    if (!user || !user.tenantCode) {
      console.error('[TenantConnectionGuard] User or tenantCode missing');
      console.error('[TenantConnectionGuard] User:', user);
      throw new UnauthorizedException('Tenant code not found in token');
    }
    
    console.log('[TenantConnectionGuard] Tenant code found:', user.tenantCode);

    try {
      // Get tenant database connection pool
      const tenantPool = await this.tenantResolver.getTenantPool(user.tenantCode);
      
      // Get tenant info for logging/indicator
      const tenantInfo = this.tenantResolver.getCachedTenantInfo(user.tenantCode);
      
      // Inject into request for use in controllers
      request.tenantPool = tenantPool;
      request.tenantCode = user.tenantCode;
      
      // Add DB info to request for logging (if indicator enabled)
      if (process.env.ENABLE_DB_INDICATOR === 'true' && tenantInfo) {
        request.tenantDbInfo = `${tenantInfo.db_name}@${tenantInfo.db_host}:${tenantInfo.db_port}`;
      }
      
      return true;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to establish tenant connection: ${error.message}`
      );
    }
  }
}

