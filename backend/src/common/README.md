# Common Module - Tenant Connection System

This module provides the infrastructure for multi-tenant database connections.

## Architecture

1. **Control Database**: All users initially connect to `PayrollControlDB` (via `CONTROL_DB_URL` in `.env`)
   - Stores: `app_users`, `tenants`, `tenant_user_links`
   
2. **Tenant Databases**: After login, each tenant has its own database
   - Connection details stored in `tenants` table: `db_host`, `db_port`, `db_name`, `db_user`, `db_password_enc`

## Components

### TenantResolverService
- Manages connection pools for both control and tenant databases
- Caches tenant connection info
- Handles connection health checks and reconnection
- Located: `backend/src/modules/auth/tenant-resolver.service.ts`

### TenantConnectionGuard
- Extracts `tenantCode` from JWT token
- Automatically establishes tenant database connection
- Injects connection pool into request object
- Located: `backend/src/common/guards/tenant-connection.guard.ts`

### TenantConnection Decorator
- Injects tenant connection pool into controller methods
- Located: `backend/src/common/decorators/tenant-connection.decorator.ts`

### BaseTenantService
- Base class for services that need tenant database access
- Located: `backend/src/common/services/base-tenant.service.ts`

## Usage Examples

### Option 1: Using Guard + Decorator in Controllers

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@nestjs/passport';
import { TenantConnectionGuard } from '@/common/guards/tenant-connection.guard';
import { TenantConnection } from '@/common/decorators/tenant-connection.decorator';
import * as sql from 'mssql';

@Controller('employees')
@UseGuards(JwtAuthGuard, TenantConnectionGuard)
export class EmployeesController {
  @Get()
  async getEmployees(@TenantConnection() pool: sql.ConnectionPool) {
    const result = await pool
      .request()
      .query('SELECT * FROM employees WHERE is_active = 1');
    return result.recordset;
  }
}
```

### Option 2: Using BaseTenantService

```typescript
import { Injectable } from '@nestjs/common';
import { BaseTenantService } from '@/common/services/base-tenant.service';
import { TenantResolverService } from '@/modules/auth/tenant-resolver.service';
import * as sql from 'mssql';

@Injectable()
export class EmployeesService extends BaseTenantService {
  constructor(tenantResolver: TenantResolverService) {
    super(tenantResolver);
  }

  async getEmployees(tenantCode: string) {
    const pool = await this.getTenantPool(tenantCode);
    const result = await pool
      .request()
      .query('SELECT * FROM employees WHERE is_active = 1');
    return result.recordset;
  }

  async getEmployeeById(tenantCode: string, employeeId: string) {
    const pool = await this.getTenantPool(tenantCode);
    const result = await pool
      .request()
      .input('id', sql.UniqueIdentifier, employeeId)
      .query('SELECT * FROM employees WHERE id = @id');
    return result.recordset[0];
  }
}
```

### Option 3: Direct Usage of TenantResolverService

```typescript
import { Injectable } from '@nestjs/common';
import { TenantResolverService } from '@/modules/auth/tenant-resolver.service';
import * as sql from 'mssql';

@Injectable()
export class MyService {
  constructor(private tenantResolver: TenantResolverService) {}

  async doSomething(tenantCode: string) {
    const pool = await this.tenantResolver.getTenantPool(tenantCode);
    // Use pool...
  }
}
```

## Connection Flow

1. User logs in → `AuthService.login()`
   - Connects to Control DB
   - Validates user credentials
   - Retrieves tenant info from `tenants` table
   - Creates JWT with `tenantCode`

2. User makes authenticated request → `TenantConnectionGuard`
   - Extracts `tenantCode` from JWT
   - Calls `TenantResolverService.getTenantPool(tenantCode)`
   - Establishes connection to tenant database
   - Injects pool into request

3. Controller/Service uses tenant connection
   - Via decorator: `@TenantConnection() pool`
   - Via service: `await this.getTenantPool(tenantCode)`

## Connection Pooling

- Each tenant has its own connection pool
- Pools are cached and reused
- Automatic reconnection on failure
- Health checks available via `isTenantConnectionHealthy()`

## Environment Variables

Required in `.env`:
```
CONTROL_DB_URL=Server=localhost;Database=PayrollControlDB;User Id=sa;Password=YourPassword;Port=1433;TrustServerCertificate=true
JWT_SECRET=your-secret-key
```

## Error Handling

- Connection failures throw `InternalServerErrorException`
- Missing tenant throws `UnauthorizedException`
- All errors are logged via NestJS Logger

