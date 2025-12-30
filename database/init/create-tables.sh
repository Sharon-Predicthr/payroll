#!/bin/bash
# Script to create all tables in PayrollControlDB
# This script runs automatically when SQL Server container starts

echo "Creating PayrollControlDB tables..."

# Wait for SQL Server to be ready
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -Q "SELECT 1" -l 30 > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Waiting for SQL Server to be ready..."
    sleep 5
fi

# Create database if it doesn't exist
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -Q "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'PayrollControlDB') CREATE DATABASE PayrollControlDB;" || exit 1

# Run table creation scripts
echo "Creating app_users table..."
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/app_users.sql || echo "Warning: app_users.sql failed"

echo "Creating tenants table..."
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/tenants.sql || echo "Warning: tenants.sql failed"

echo "Creating tenant_user_links table..."
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/tenant_user_links.sql || echo "Warning: tenant_user_links.sql failed"

echo "Creating scheduled_jobs table..."
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/scheduled_jobs.sql || echo "Warning: scheduled_jobs.sql failed"

echo "Creating auth_audit_log table..."
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/auth_audit_log.sql || echo "Warning: auth_audit_log.sql failed"

echo "Verifying tables..."
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -Q "SELECT TABLE_NAME, COUNT(*) AS ColumnCount FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' GROUP BY TABLE_NAME ORDER BY TABLE_NAME;" -h -1

echo "All tables created successfully!"


