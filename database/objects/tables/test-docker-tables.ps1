# Test script to verify all tables are created after Docker restart
# This will:
# 1. Stop and remove SQL Server container and volume
# 2. Start SQL Server fresh
# 3. Run table creation scripts
# 4. Verify all tables exist

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Table Creation in Docker" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Stopping SQL Server..." -ForegroundColor Yellow
docker compose stop sqlserver

Write-Host "Step 2: Removing SQL Server container and volume..." -ForegroundColor Yellow
docker compose rm -f sqlserver
docker volume rm payroll_sqlserver-data -f 2>

Write-Host "Step 3: Starting SQL Server fresh..." -ForegroundColor Yellow
docker compose up -d sqlserver

Write-Host "Step 4: Waiting for SQL Server to be ready..." -ForegroundColor Yellow
 = 60
 = 0
while ( -lt ) {
    Start-Sleep -Seconds 2
     += 2
     = docker exec payroll-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -Q "SELECT 1" 2>
    if ( -eq 0) {
        Write-Host "  SQL Server is ready! (waited  seconds)" -ForegroundColor Green
        break
    }
    Write-Host "  Waiting... ( seconds)" -ForegroundColor Gray
}

if ( -ge ) {
    Write-Host "SQL Server took too long to start!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 5: Running table creation scripts..." -ForegroundColor Yellow
docker exec payroll-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/app_users.sql
docker exec payroll-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/tenants.sql
docker exec payroll-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/tenant_user_links.sql
docker exec payroll-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/scheduled_jobs.sql
docker exec payroll-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/auth_audit_log.sql

Write-Host ""
Write-Host "Step 6: Verifying all tables..." -ForegroundColor Yellow
docker exec payroll-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/verify_tables.sql

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
