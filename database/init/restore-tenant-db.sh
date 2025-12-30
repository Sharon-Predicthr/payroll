#!/bin/bash
# Script to restore tenant database from backup file
# Usage: Place your .bak file in database/backups/ directory
# The script will restore it to a database named "PayrollTenantDB"

set -e

SQL_SERVER_HOST=${SQL_SERVER_HOST:-sqlserver}
BACKUP_DIR="/backups"
BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.bak 2>/dev/null | head -1)
TENANT_DB_NAME="PayrollTenantDB"

if [ -z "$BACKUP_FILE" ]; then
    echo "No .bak file found in $BACKUP_DIR"
    echo "Skipping tenant database restore"
    exit 0
fi

echo "=========================================="
echo "Restoring Tenant Database from Backup"
echo "=========================================="
echo ""
echo "Backup file: $(basename $BACKUP_FILE)"
echo "Target database: $TENANT_DB_NAME"
echo ""

echo "Preparing restore..."
# First, verify the backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found at $BACKUP_FILE"
    exit 1
fi

# Display file information
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup file size: $FILE_SIZE"
echo "Verifying backup file accessibility..."
if [ ! -r "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file is not readable"
    exit 1
fi
echo "Backup file is accessible"
echo ""

echo "Using logical file names (verified from backup):"
DATA_FILE_NAME="payroll_v01"
LOG_FILE_NAME="payroll_v01_log"
echo "  Data file: $DATA_FILE_NAME"
echo "  Log file: $LOG_FILE_NAME"
echo ""

echo "Restoring database (this may take a few minutes for large backups)..."
echo "Starting restore at $(date)"
/opt/mssql-tools18/bin/sqlcmd -S "$SQL_SERVER_HOST" -U sa -P "$MSSQL_SA_PASSWORD" -C <<EOF
-- Drop database if it exists
IF EXISTS (SELECT * FROM sys.databases WHERE name = '$TENANT_DB_NAME')
BEGIN
    ALTER DATABASE [$TENANT_DB_NAME] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [$TENANT_DB_NAME];
    PRINT 'Existing database dropped';
END
GO

-- Restore database with MOVE to correct Linux paths
RESTORE DATABASE [$TENANT_DB_NAME]
FROM DISK = '/backups/$(basename $BACKUP_FILE)'
WITH 
    MOVE '$DATA_FILE_NAME' TO '/var/opt/mssql/data/${TENANT_DB_NAME}.mdf',
    MOVE '$LOG_FILE_NAME' TO '/var/opt/mssql/data/${TENANT_DB_NAME}_log.ldf',
    REPLACE, 
    RECOVERY,
    STATS = 10;
GO

-- Verify database is online
IF EXISTS (SELECT * FROM sys.databases WHERE name = '$TENANT_DB_NAME' AND state_desc = 'ONLINE')
BEGIN
    PRINT 'Database restored and online successfully';
    
    -- Count objects to verify restore completeness
    DECLARE @TableCount INT;
    DECLARE @ProcCount INT;
    DECLARE @ViewCount INT;
    
    SELECT @TableCount = COUNT(*) FROM [$TENANT_DB_NAME].sys.tables WHERE is_ms_shipped = 0;
    SELECT @ProcCount = COUNT(*) FROM [$TENANT_DB_NAME].sys.procedures WHERE is_ms_shipped = 0;
    SELECT @ViewCount = COUNT(*) FROM [$TENANT_DB_NAME].sys.views WHERE is_ms_shipped = 0;
    
    PRINT 'Restored objects:';
    PRINT '  Tables: ' + CAST(@TableCount AS NVARCHAR(10));
    PRINT '  Stored Procedures: ' + CAST(@ProcCount AS NVARCHAR(10));
    PRINT '  Views: ' + CAST(@ViewCount AS NVARCHAR(10));
END
ELSE
BEGIN
    PRINT 'WARNING: Database may not be fully online';
END
GO
EOF

echo "Restore completed at $(date)"
echo ""

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "Tenant database restored successfully!"
    echo "=========================================="
    echo "Database name: $TENANT_DB_NAME"
    echo ""
    
    # Verify stored procedures were restored
    echo "Verifying database objects..."
    STORED_PROC_COUNT=$(/opt/mssql-tools18/bin/sqlcmd -S "$SQL_SERVER_HOST" -U sa -P "$MSSQL_SA_PASSWORD" -C -h -1 -Q "USE [$TENANT_DB_NAME]; SELECT COUNT(*) FROM sys.procedures WHERE is_ms_shipped = 0;")
    TABLE_COUNT=$(/opt/mssql-tools18/bin/sqlcmd -S "$SQL_SERVER_HOST" -U sa -P "$MSSQL_SA_PASSWORD" -C -h -1 -Q "USE [$TENANT_DB_NAME]; SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0;")
    
    echo "  Tables restored: $TABLE_COUNT"
    echo "  Stored procedures restored: $STORED_PROC_COUNT"
    echo ""
else
    echo ""
    echo "ERROR: Database restore failed"
    exit 1
fi
