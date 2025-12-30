#!/bin/bash
# Script to run all migration scripts from backend/database/migrations
# This runs after SQL Server is ready and database/tables are created

set -e

echo "=========================================="
echo "Running Database Migrations"
echo "=========================================="

# Wait for SQL Server to be ready
MAX_RETRIES=60
RETRY_COUNT=0

echo "Waiting for SQL Server to be ready..."
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "SELECT 1" > /dev/null 2>&1; then
        echo "SQL Server is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "ERROR: SQL Server did not become ready in time!"
    exit 1
fi

# Ensure database exists
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'PayrollControlDB') CREATE DATABASE PayrollControlDB;" > /dev/null 2>&1

# Run migrations from the mounted directory
MIGRATIONS_DIR="/docker-entrypoint-initdb.d/migrations"

if [ -d "$MIGRATIONS_DIR" ]; then
    echo ""
    echo "Running migration scripts..."
    echo "----------------------------"
    
    # Find all .sql files and sort them by name
    for migration_file in $(find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort); do
        migration_name=$(basename "$migration_file")
        echo "  Running $migration_name..."
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -i "$migration_file" || {
            echo "    ERROR: Failed to run $migration_name"
            exit 1
        }
        echo "    ✓ $migration_name completed"
    done
    
    echo ""
    echo "=========================================="
    echo "All migrations completed successfully!"
    echo "=========================================="
else
    echo "No migrations directory found at $MIGRATIONS_DIR"
fi


