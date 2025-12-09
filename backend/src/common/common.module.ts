import { Module, Global } from '@nestjs/common';
import { TenantResolverService } from '../modules/auth/tenant-resolver.service';
import { TenantConnectionGuard } from './guards/tenant-connection.guard';

/**
 * Common module that exports shared services and guards
 * This module should be imported by other modules that need tenant connection
 */
@Global()
@Module({
  providers: [TenantConnectionGuard],
  exports: [TenantConnectionGuard],
})
export class CommonModule {}

