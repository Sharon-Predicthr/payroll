# Multi-Tenant Database Connection System

## Overview

The system implements a multi-tenant architecture where:
1. **Control Database** (`PayrollControlDB`): Stores users, tenants, and tenant-user relationships
2. **Tenant Databases**: Each tenant has its own database with connection details stored in the control DB

## Architecture Flow

```
User Login
    ↓
Connect to Control DB (via CONTROL_DB_URL)
    ↓
Validate User & Get Tenant Info
    ↓
Create JWT with tenantCode
    ↓
User Makes Request (with JWT)
    ↓
TenantConnectionGuard extracts tenantCode
    ↓
TenantResolverService gets tenant DB connection
    ↓
Controller/Service uses tenant connection
```

## Key Components

### 1. TenantResolverService
**Location**: `backend/src/modules/auth/tenant-resolver.service.ts`

**Responsibilities**:
- Manages control database connection pool
- Manages tenant database connection pools (one per tenant)
- Caches tenant connection info
- Handles connection health checks
- Automatic reconnection on failure

**Key Methods**:
- `getTenantPool(tenantCode: string)`: Get or create tenant database connection
- `getTenantInfo(tenantCode: string)`: Get tenant connection details from control DB
- `isTenantConnectionHealthy(tenantCode: string)`: Check connection health
- `closeTenantConnection(tenantCode: string)`: Close specific tenant connection
- `closeAllConnections()`: Graceful shutdown

### 2. TenantConnectionGuard
**Location**: `backend/src/common/guards/tenant-connection.guard.ts`

**Responsibilities**:
- Extracts `tenantCode` from JWT token (set by `JwtStrategy`)
- Calls `TenantResolverService.getTenantPool()` to establish connection
- Injects connection pool into request object as `request.tenantPool`
- Injects tenant code into request as `request.tenantCode`

**Usage**:
```typescript
@UseGuards(JwtAuthGuard, TenantConnectionGuard)
```

### 3. TenantConnection Decorator
**Location**: `backend/src/common/decorators/tenant-connection.decorator.ts`

**Responsibilities**:
- Injects tenant connection pool into controller method parameters

**Usage**:
```typescript
@Get()
async getData(@TenantConnection() pool: sql.ConnectionPool) {
  // Use pool to query tenant database
}
```

### 4. BaseTenantService
**Location**: `backend/src/common/services/base-tenant.service.ts`

**Responsibilities**:
- Base class for services that need tenant database access
- Provides helper methods: `getTenantPool()`, `getTenantInfo()`, `isConnectionHealthy()`

**Usage**:
```typescript
@Injectable()
export class EmployeesService extends BaseTenantService {
  constructor(tenantResolver: TenantResolverService) {
    super(tenantResolver);
  }
  
  async getEmployees(tenantCode: string) {
    const pool = await this.getTenantPool(tenantCode);
    // Use pool...
  }
}
```

## Database Schema Requirements

### Control Database Tables

**tenants** table must have:
- `code` (NVARCHAR) - Unique tenant identifier
- `name` (NVARCHAR) - Tenant name
- `db_host` (NVARCHAR) - Tenant database server
- `db_port` (INT) - Tenant database port
- `db_name` (NVARCHAR) - Tenant database name
- `db_user` (NVARCHAR) - Tenant database user
- `db_password_enc` (NVARCHAR) - Tenant database password (encrypted/plain)
- `is_active` (BIT) - Whether tenant is active

**app_users** table:
- Standard user fields

**tenant_user_links** table:
- Links users to tenants with roles

## Environment Configuration

### Required Environment Variables

```env
# Control Database Connection
CONTROL_DB_URL=Server=localhost;Database=PayrollControlDB;User Id=sa;Password=YourPassword;Port=1433;TrustServerCertificate=true

# JWT Secret
JWT_SECRET=your-secret-key-change-in-production
```

### Connection String Format

```
Server=<host>;Database=<database>;User Id=<user>;Password=<password>;Port=<port>;TrustServerCertificate=true
```

## Usage Examples

### Example 1: Controller with Guard + Decorator

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

### Example 2: Service Extending BaseTenantService

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
}
```

### Example 3: Direct Usage

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

## Connection Pooling

- **Control DB**: Single connection pool, reused across all requests
- **Tenant DBs**: One connection pool per tenant, cached and reused
- **Pool Configuration**:
  - Max connections: 10
  - Min connections: 0
  - Idle timeout: 30 seconds
  - Automatic reconnection on failure

## Error Handling

- **Missing tenant**: `UnauthorizedException`
- **Connection failure**: `InternalServerErrorException`
- **Database not configured**: `InternalServerErrorException`
- All errors are logged via NestJS Logger

## Security Considerations

1. **JWT Token**: Contains `tenantCode` - never expose sensitive connection details
2. **Connection Strings**: Stored encrypted in database (`db_password_enc`)
3. **Connection Isolation**: Each tenant can only access their own database
4. **Validation**: Tenant connection details are validated during login

## Testing

To test the tenant connection system:

1. Ensure control database has tenant records with valid connection details
2. Login to get JWT token with `tenantCode`
3. Make authenticated request with JWT token
4. `TenantConnectionGuard` will automatically establish tenant connection
5. Use `@TenantConnection()` decorator to access the connection pool

## Next Steps

1. Implement actual business logic services (Employees, Payroll, etc.)
2. Add database migrations for tenant databases
3. Add connection monitoring and metrics
4. Implement connection retry logic with exponential backoff
5. Add connection pool metrics and monitoring

