-- Script to verify all tables exist in PayrollControlDB
-- Run this script to check if all tables are created correctly

USE PayrollControlDB;
GO

PRINT '========================================';
PRINT 'Verifying Tables in PayrollControlDB';
PRINT '========================================';
PRINT '';

-- Expected tables
DECLARE @ExpectedTables TABLE (
    TableName NVARCHAR(255),
    ExpectedColumns INT
);

INSERT INTO @ExpectedTables VALUES
    ('app_users', 7),
    ('tenants', 11),
    ('tenant_user_links', 5),
    ('scheduled_jobs', 8),
    ('auth_audit_log', 7);

-- Check each table
DECLARE @TableName NVARCHAR(255);
DECLARE @ExpectedColumns INT;
DECLARE @ActualColumns INT;
DECLARE @TableExists BIT;
DECLARE @AllTablesExist BIT = 1;
DECLARE @AllColumnsMatch BIT = 1;

DECLARE table_cursor CURSOR FOR
SELECT TableName, ExpectedColumns FROM @ExpectedTables;

OPEN table_cursor;
FETCH NEXT FROM table_cursor INTO @TableName, @ExpectedColumns;

PRINT 'Table Verification Results:';
PRINT '----------------------------';

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Check if table exists
    SELECT @TableExists = CASE 
        WHEN EXISTS (
            SELECT * FROM sys.objects 
            WHERE object_id = OBJECT_ID('dbo.' + @TableName) 
            AND type = 'U'
        ) THEN 1 
        ELSE 0 
    END;
    
    -- Get actual column count
    SELECT @ActualColumns = COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName;
    
    -- Print result
    IF @TableExists = 1
    BEGIN
        IF @ActualColumns = @ExpectedColumns
        BEGIN
            PRINT '✓ ' + @TableName + ' - EXISTS (' + CAST(@ActualColumns AS VARCHAR) + ' columns)';
        END
        ELSE
        BEGIN
            PRINT '⚠ ' + @TableName + ' - EXISTS but column count mismatch! Expected: ' + 
                  CAST(@ExpectedColumns AS VARCHAR) + ', Actual: ' + CAST(@ActualColumns AS VARCHAR);
            SET @AllColumnsMatch = 0;
        END
    END
    ELSE
    BEGIN
        PRINT '✗ ' + @TableName + ' - MISSING!';
        SET @AllTablesExist = 0;
    END
    
    FETCH NEXT FROM table_cursor INTO @TableName, @ExpectedColumns;
END

CLOSE table_cursor;
DEALLOCATE table_cursor;

PRINT '';
PRINT '========================================';
PRINT 'Summary';
PRINT '========================================';

IF @AllTablesExist = 1 AND @AllColumnsMatch = 1
BEGIN
    PRINT '✓ ALL TABLES EXIST AND COLUMN COUNTS MATCH!';
    PRINT '';
    PRINT 'All tables verified successfully!';
END
ELSE
BEGIN
    IF @AllTablesExist = 0
        PRINT '✗ Some tables are missing!';
    IF @AllColumnsMatch = 0
        PRINT '⚠ Some tables have incorrect column counts!';
END

PRINT '';
PRINT 'Detailed Table Information:';
PRINT '----------------------------';

-- Show all tables with column details
SELECT 
    t.TABLE_NAME AS 'Table Name',
    COUNT(c.COLUMN_NAME) AS 'Column Count',
    CASE 
        WHEN EXISTS (
            SELECT * FROM sys.indexes i
            WHERE i.object_id = OBJECT_ID('dbo.' + t.TABLE_NAME)
            AND i.is_primary_key = 1
        ) THEN 'Yes' 
        ELSE 'No' 
    END AS 'Has Primary Key',
    CASE 
        WHEN EXISTS (
            SELECT * FROM sys.foreign_keys fk
            WHERE fk.parent_object_id = OBJECT_ID('dbo.' + t.TABLE_NAME)
        ) THEN 'Yes' 
        ELSE 'No' 
    END AS 'Has Foreign Keys'
FROM INFORMATION_SCHEMA.TABLES t
LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
WHERE t.TABLE_SCHEMA = 'dbo' AND t.TABLE_TYPE = 'BASE TABLE'
GROUP BY t.TABLE_NAME
ORDER BY t.TABLE_NAME;

GO


