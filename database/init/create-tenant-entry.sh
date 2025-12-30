#!/bin/bash
# Script to create tenant entry in PayrollControlDB pointing to the restored tenant database
# This should run after restore-tenant-db.sh

set -e

SQL_SERVER_HOST=${SQL_SERVER_HOST:-sqlserver}
TENANT_DB_NAME="PayrollTenantDB"
TENANT_CODE="default"
TENANT_NAME="Default Tenant"

echo "=========================================="
echo "Creating Tenant Entry"
echo "=========================================="
echo ""

# Check if tenant database exists
DB_EXISTS=$(/opt/mssql-tools18/bin/sqlcmd -S "$SQL_SERVER_HOST" -U sa -P "$MSSQL_SA_PASSWORD" -C -h -1 -Q "
IF EXISTS (SELECT * FROM sys.databases WHERE name = '$TENANT_DB_NAME')
    SELECT 'EXISTS'
ELSE
    SELECT 'NOT_EXISTS'
" | tr -d '[:space:]')

if [ "$DB_EXISTS" != "EXISTS" ]; then
    echo "WARNING: Tenant database $TENANT_DB_NAME does not exist"
    echo "Skipping tenant entry creation"
    exit 0
fi

# Create or update tenant entry
echo "Creating/updating tenant entry in PayrollControlDB..."
/opt/mssql-tools18/bin/sqlcmd -S "$SQL_SERVER_HOST" -U sa -P "$MSSQL_SA_PASSWORD" -C -d PayrollControlDB <<EOF
-- Check if tenant exists
IF EXISTS (SELECT * FROM tenants WHERE code = '$TENANT_CODE')
BEGIN
    -- Update existing tenant
    UPDATE tenants
    SET 
        name = '$TENANT_NAME',
        db_host = 'sqlserver',
        db_port = 1433,
        db_name = '$TENANT_DB_NAME',
        db_user = 'sa',
        db_password_enc = 'MyStrongPass123!',
        is_active = 1,
        updated_at = GETDATE()
    WHERE code = '$TENANT_CODE';
    PRINT 'Tenant updated: $TENANT_CODE';
END
ELSE
BEGIN
    -- Create new tenant
    INSERT INTO tenants (code, name, db_host, db_port, db_name, db_user, db_password_enc, is_active)
    VALUES ('$TENANT_CODE', '$TENANT_NAME', 'sqlserver', 1433, '$TENANT_DB_NAME', 'sa', 'MyStrongPass123!', 1);
    PRINT 'Tenant created: $TENANT_CODE';
END
GO

-- Verify tenant entry
SELECT 
    code,
    name,
    db_name,
    is_active
FROM tenants
WHERE code = '$TENANT_CODE';
GO
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "Tenant entry created successfully!"
    echo "=========================================="
    echo "Tenant code: $TENANT_CODE"
    echo "Tenant name: $TENANT_NAME"
    echo "Database: $TENANT_DB_NAME"
    echo ""
else
    echo ""
    echo "ERROR: Failed to create tenant entry"
    exit 1
fi


