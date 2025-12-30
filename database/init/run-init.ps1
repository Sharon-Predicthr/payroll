# Script to run database initialization after Docker compose up
# Usage: After running 'docker compose up -d', run this script

Write-Host "Running database initialization..." -ForegroundColor Cyan

# Wait for SQL Server to be healthy
Write-Host "Waiting for SQL Server to be ready..." -ForegroundColor Yellow
\ = 60
\ = 0
while (\ -lt \) {
    \ = docker exec payroll-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -Q "SELECT 1" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SQL Server is ready!" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 2
    \ += 2
}

# Run initialization script
Write-Host "Running database and table creation..." -ForegroundColor Yellow
docker exec payroll-sqlserver bash -c "chmod +x /docker-entrypoint-initdb.d/create-db-and-tables.sh && MSSQL_SA_PASSWORD=MyStrongPass123! /docker-entrypoint-initdb.d/create-db-and-tables.sh"

Write-Host "Initialization complete!" -ForegroundColor Green
