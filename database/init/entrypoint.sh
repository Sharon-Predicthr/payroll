#!/bin/bash
# Entrypoint script for SQL Server container
# This script runs after SQL Server starts and creates the database and tables

# Start SQL Server in the background
/opt/mssql/bin/sqlservr &

# Wait for SQL Server to be ready
echo "Waiting for SQL Server to start..."
for i in {1..60}; do
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "SELECT 1" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "SQL Server is ready!"
        break
    fi
    sleep 2
done

# Create database if it doesn't exist
echo "Creating PayrollControlDB database..."
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'PayrollControlDB') CREATE DATABASE PayrollControlDB;" || exit 1

# Run table creation scripts if they exist
if [ -d "/docker-entrypoint-initdb.d/tables" ]; then
    echo "Creating tables..."
    
    if [ -f "/docker-entrypoint-initdb.d/tables/app_users.sql" ]; then
        echo "  Creating app_users table..."
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/app_users.sql
    fi
    
    if [ -f "/docker-entrypoint-initdb.d/tables/tenants.sql" ]; then
        echo "  Creating tenants table..."
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/tenants.sql
    fi
    
    if [ -f "/docker-entrypoint-initdb.d/tables/tenant_user_links.sql" ]; then
        echo "  Creating tenant_user_links table..."
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/tenant_user_links.sql
    fi
    
    if [ -f "/docker-entrypoint-initdb.d/tables/scheduled_jobs.sql" ]; then
        echo "  Creating scheduled_jobs table..."
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/scheduled_jobs.sql
    fi
    
    if [ -f "/docker-entrypoint-initdb.d/tables/auth_audit_log.sql" ]; then
        echo "  Creating auth_audit_log table..."
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -i /docker-entrypoint-initdb.d/tables/auth_audit_log.sql
    fi
    
    echo "All tables created!"
fi

# Keep container running
wait


