# Database Connection Indicator

This feature adds indicators to show which database the user is connected to. Useful for testing and debugging.

## How to Enable/Disable

### Enable
Add to `.env` file:
```env
ENABLE_DB_INDICATOR=true
```

### Disable
Remove the variable or set to `false`:
```env
ENABLE_DB_INDICATOR=false
```

## What It Shows

### 1. Login Response
When `ENABLE_DB_INDICATOR=true`, the login response includes `_dbInfo`:

```json
{
  "access_token": "eyJhbGc...",
  "user": { "id": "...", "email": "user@example.com" },
  "tenant": { "code": "TENANT01", "name": "Acme Corp" },
  "_dbInfo": {
    "tenantCode": "TENANT01",
    "tenantName": "Acme Corp",
    "dbHost": "localhost",
    "dbName": "Payroll_TENANT01",
    "dbPort": 1433,
    "dbUser": "sa",
    "controlDb": "PayrollControlDB"
  }
}
```

### 2. Response Headers
All API responses include headers:
- `X-Tenant-DB-Host`: Database server host
- `X-Tenant-DB-Name`: Database name
- `X-Tenant-Code`: Tenant code

### 3. Response Body
If the response is an object, it includes `_dbInfo`:

```json
{
  "data": [...],
  "_dbInfo": {
    "tenantCode": "TENANT01",
    "tenantName": "Acme Corp",
    "dbHost": "localhost",
    "dbName": "Payroll_TENANT01",
    "dbPort": 1433,
    "dbUser": "sa"
  }
}
```

### 4. Server Logs
Each request logs the tenant and database info:
```
[TenantDB] [GET] /api/employees | Tenant: TENANT01 | DB: Payroll_TENANT01@localhost:1433 | Status: 200
```

## Security Note

⚠️ **Important**: This feature exposes database connection details. 
- **Only enable during development/testing**
- **Never enable in production**
- The password is never exposed, only host, name, port, and user

## Example Usage

### Check Login Response
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq '._dbInfo'
```

### Check Response Headers
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/employees \
  -v 2>&1 | grep "X-Tenant"
```

### Check Server Logs
Watch the console output when making requests - you'll see:
```
[TenantDB] [GET] /api/employees | Tenant: TENANT01 | DB: Payroll_TENANT01@localhost:1433 | Status: 200
```

## Disabling for Production

Before deploying to production:

1. Remove or set `ENABLE_DB_INDICATOR=false` in `.env`
2. Restart the server
3. Verify no `_dbInfo` in responses
4. Verify no `X-Tenant-*` headers in responses
5. Verify no tenant DB logs in console

