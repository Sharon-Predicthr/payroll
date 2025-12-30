#!/bin/bash
# Master script to create all tables in PayrollControlDB
# This script runs automatically when SQL Server container starts

echo "=========================================="
echo "Creating PayrollControlDB Tables"
echo "=========================================="

# Wait for SQL Server to be ready
echo "Waiting for SQL Server to be ready..."
for i in {1..30}; do
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -Q "SELECT 1" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "SQL Server is ready!"
        break
    fi
    echo "  Attempt $i/30..."
    sleep 2
done

# Create database if it doesn't exist
echo ""
echo "Creating PayrollControlDB database..."
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -Q "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'PayrollControlDB') CREATE DATABASE PayrollControlDB;" || exit 1

# Run table creation scripts
echo ""
echo "Creating tables..."
echo "-------------------"

if [ -f "/docker-entrypoint-initdb.d/tables/app_users.sql" ]; then
    echo "  Creating app_users..."
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/app_users.sql
fi

if [ -f "/docker-entrypoint-initdb.d/tables/tenants.sql" ]; then
    echo "  Creating tenants..."
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/tenants.sql
fi

if [ -f "/docker-entrypoint-initdb.d/tables/tenant_user_links.sql" ]; then
    echo "  Creating tenant_user_links..."
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/tenant_user_links.sql
fi

if [ -f "/docker-entrypoint-initdb.d/tables/scheduled_jobs.sql" ]; then
    echo "  Creating scheduled_jobs..."
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/scheduled_jobs.sql
fi

if [ -f "/docker-entrypoint-initdb.d/tables/auth_audit_log.sql" ]; then
    echo "  Creating auth_audit_log..."
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/auth_audit_log.sql
fi

# Verify tables
echo ""
echo "Verifying tables..."
echo "-------------------"
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P MyStrongPass123! -C -d PayrollControlDB -Q "SELECT TABLE_NAME, COUNT(*) AS ColumnCount FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' GROUP BY TABLE_NAME ORDER BY TABLE_NAME;" -h -1 -W

echo ""
echo "=========================================="
echo "Table creation complete!"
echo "=========================================="


