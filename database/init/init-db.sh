#!/bin/bash
# Initialization script for SQL Server
# This script runs once when SQL Server container starts for the first time

echo "=========================================="
echo "Initializing PayrollControlDB"
echo "=========================================="

# Wait for SQL Server to be ready
echo "Waiting for SQL Server to be ready..."
for i in {1..60}; do
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "SELECT 1" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "SQL Server is ready!"
        break
    fi
    sleep 2
done

# Create database if it doesn't exist
echo ""
echo "Creating PayrollControlDB database..."
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'PayrollControlDB') BEGIN CREATE DATABASE PayrollControlDB; PRINT 'Database PayrollControlDB created successfully'; END ELSE BEGIN PRINT 'Database PayrollControlDB already exists'; END;"

# Check if tables already exist
TABLE_COUNT=$(/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -h -1 -Q "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE';" | grep -E '^[0-9]+$' | head -1)

if [ "$TABLE_COUNT" -gt "0" ]; then
    echo "Tables already exist ($TABLE_COUNT tables found). Skipping table creation."
    exit 0
fi

# Run table creation scripts
echo ""
echo "Creating tables..."
echo "-------------------"

if [ -d "/docker-entrypoint-initdb.d/tables" ]; then
    if [ -f "/docker-entrypoint-initdb.d/tables/app_users.sql" ]; then
        echo "  Creating app_users..."
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/app_users.sql
    fi
    
    if [ -f "/docker-entrypoint-initdb.d/tables/tenants.sql" ]; then
        echo "  Creating tenants..."
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/tenants.sql
    fi
    
    if [ -f "/docker-entrypoint-initdb.d/tables/tenant_user_links.sql" ]; then
        echo "  Creating tenant_user_links..."
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/tenant_user_links.sql
    fi
    
    if [ -f "/docker-entrypoint-initdb.d/tables/scheduled_jobs.sql" ]; then
        echo "  Creating scheduled_jobs..."
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/scheduled_jobs.sql
    fi
    
    if [ -f "/docker-entrypoint-initdb.d/tables/auth_audit_log.sql" ]; then
        echo "  Creating auth_audit_log..."
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/auth_audit_log.sql
    fi
    
    echo ""
    echo "Verifying tables..."
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -Q "SELECT TABLE_NAME, COUNT(*) AS ColumnCount FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' GROUP BY TABLE_NAME ORDER BY TABLE_NAME;" -h -1 -W
    
    echo ""
    echo "=========================================="
    echo "Initialization complete!"
    echo "=========================================="
fi


