-- SSMS Connection Test Script
-- Run this after connecting to verify everything works

USE PayrollControlDB;
GO

SELECT 
    'Connection successful!' AS Status,
    @@SERVERNAME AS ServerName,
    DB_NAME() AS DatabaseName,
    SYSTEM_USER AS CurrentUser;
GO

-- List all tables
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_SCHEMA, TABLE_NAME;
GO

-- Check user count
SELECT COUNT(*) AS UserCount FROM app_users;
SELECT COUNT(*) AS TenantCount FROM tenants;
GO
