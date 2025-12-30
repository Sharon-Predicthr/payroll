#!/bin/bash
# This script creates the database and all tables
# It's designed to run automatically when SQL Server container starts

set -e

echo "=========================================="
echo "Initializing PayrollControlDB Database"
echo "=========================================="

# SQL Server hostname (from docker network)
SQL_SERVER_HOST=${SQL_SERVER_HOST:-sqlserver}

# Wait for SQL Server to be ready (with timeout)
MAX_RETRIES=60
RETRY_COUNT=0

echo "Waiting for SQL Server to be ready..."
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if /opt/mssql-tools18/bin/sqlcmd -S "$SQL_SERVER_HOST" -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "SELECT 1" > /dev/null 2>&1; then
        echo "SQL Server is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Attempt $RETRY_COUNT/$MAX_RETRIES..."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "ERROR: SQL Server did not become ready in time!"
    exit 1
fi

# Create database if it doesn't exist
echo ""
echo "Creating PayrollControlDB database..."
/opt/mssql-tools18/bin/sqlcmd -S "$SQL_SERVER_HOST" -U sa -P "$MSSQL_SA_PASSWORD" -C <<EOF
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'PayrollControlDB')
BEGIN
    CREATE DATABASE PayrollControlDB;
    PRINT 'Database PayrollControlDB created successfully';
END
ELSE
BEGIN
    PRINT 'Database PayrollControlDB already exists';
END
GO
EOF

# Check if tables already exist
TABLE_COUNT=$(/opt/mssql-tools18/bin/sqlcmd -S "$SQL_SERVER_HOST" -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -h -1 -Q "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE';" 2>/dev/null | tr -d '[:space:]' | grep -E '^[0-9]+$' || echo "0")

if [ "$TABLE_COUNT" -gt "0" ]; then
    echo "Tables already exist ($TABLE_COUNT tables found). Skipping table creation."
    exit 0
fi

# Create tables
echo ""
echo "Creating tables..."
echo "-------------------"

TABLES_DIR="/tables"

if [ -d "$TABLES_DIR" ]; then
    for table in app_users tenants tenant_user_links scheduled_jobs auth_audit_log; do
        if [ -f "$TABLES_DIR/$table.sql" ]; then
            echo "  Creating $table table..."
            /opt/mssql-tools18/bin/sqlcmd -S "$SQL_SERVER_HOST" -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -i "$TABLES_DIR/$table.sql" || echo "    Warning: Failed to create $table"
        fi
    done
fi

# Verify tables
echo ""
echo "Verifying tables..."
/opt/mssql-tools18/bin/sqlcmd -S "$SQL_SERVER_HOST" -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -Q "SELECT TABLE_NAME, COUNT(*) AS ColumnCount FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' GROUP BY TABLE_NAME ORDER BY TABLE_NAME;" -h -1 -W

echo ""
echo "=========================================="
echo "Database initialization complete!"
echo "=========================================="

# Restore tenant database from backup if backup file exists
if [ -d "/backups" ] && [ "$(ls -A /backups/*.bak 2>/dev/null)" ]; then
    echo ""
    echo "Backup file found, restoring tenant database..."
    if [ -f "/docker-entrypoint-initdb.d/restore-tenant-db.sh" ]; then
        bash /docker-entrypoint-initdb.d/restore-tenant-db.sh
        if [ $? -eq 0 ] && [ -f "/docker-entrypoint-initdb.d/create-tenant-entry.sh" ]; then
            echo "Creating tenant entry..."
            bash /docker-entrypoint-initdb.d/create-tenant-entry.sh
        fi
    fi
fi

# Run migrations if they exist
MIGRATIONS_DIR="/migrations"
if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A $MIGRATIONS_DIR/*.sql 2>/dev/null)" ]; then
    echo ""
    echo "Running migration scripts..."
    echo "----------------------------"
    
    for migration_file in $(find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort); do
        migration_name=$(basename "$migration_file")
        echo "  Running $migration_name..."
        /opt/mssql-tools18/bin/sqlcmd -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB -i "$migration_file" || {
            echo "    ERROR: Failed to run $migration_name"
            exit 1
        }
        echo "    ✓ $migration_name completed"
    done
    
    echo ""
    echo "All migrations completed!"
fi

