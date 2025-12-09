-- ============================================================
-- Seed Default Organization Levels
-- Migration: 051_seed_default_org_levels.sql
-- Description: Creates default organization levels for a tenant
-- ============================================================

-- IMPORTANT: This script must be run in the TENANT database context
-- You need to provide the tenant_id as a parameter or variable
-- 
-- Usage:
-- 1. Connect to your tenant database (e.g., payroll_v01)
-- 2. Set @tenant_id to your tenant's GUID
-- 3. Run this script

-- ============================================================
-- OPTION 1: Manual - Set tenant_id directly
-- ============================================================
-- Replace 'YOUR-TENANT-ID-HERE' with your actual tenant GUID
DECLARE @tenant_id UNIQUEIDENTIFIER = 'YOUR-TENANT-ID-HERE';

-- ============================================================
-- OPTION 2: Get tenant_id from Control DB (if you have access)
-- ============================================================
-- Uncomment and modify if you have access to Control DB from this context:
/*
DECLARE @tenant_code NVARCHAR(50) = 'ACME'; -- Change to your tenant code
DECLARE @tenant_id UNIQUEIDENTIFIER;

-- Query Control DB (adjust database name if different)
SELECT @tenant_id = id 
FROM PayrollControlDB.dbo.tenants 
WHERE code = @tenant_code AND is_active = 1;
*/

-- ============================================================
-- Create Default Levels
-- ============================================================
IF @tenant_id IS NOT NULL AND @tenant_id != '00000000-0000-0000-0000-000000000000'
BEGIN
    -- Check if levels already exist
    IF NOT EXISTS (SELECT 1 FROM org_levels WHERE tenant_id = @tenant_id)
    BEGIN
        -- Level 1: Region
        INSERT INTO org_levels (tenant_id, [key], display_name, level_order, is_active)
        VALUES (@tenant_id, 'region', 'Region', 1, 1);

        -- Level 2: Factory
        INSERT INTO org_levels (tenant_id, [key], display_name, level_order, is_active)
        VALUES (@tenant_id, 'factory', 'Factory', 2, 1);

        -- Level 3: Section
        INSERT INTO org_levels (tenant_id, [key], display_name, level_order, is_active)
        VALUES (@tenant_id, 'section', 'Section', 3, 1);

        -- Level 4: Department
        INSERT INTO org_levels (tenant_id, [key], display_name, level_order, is_active)
        VALUES (@tenant_id, 'department', 'Department', 4, 1);

        -- Level 5: Work Center
        INSERT INTO org_levels (tenant_id, [key], display_name, level_order, is_active)
        VALUES (@tenant_id, 'work_center', 'Work Center', 5, 1);

        PRINT 'Default organization levels created for tenant: ' + CAST(@tenant_id AS NVARCHAR(50));
        PRINT 'Created 5 levels: Region, Factory, Section, Department, Work Center';
    END
    ELSE
    BEGIN
        PRINT 'Organization levels already exist for tenant: ' + CAST(@tenant_id AS NVARCHAR(50));
        PRINT 'Skipping seed - levels already present';
    END
END
ELSE
BEGIN
    PRINT 'ERROR: Invalid tenant_id. Please set @tenant_id to your tenant GUID before running this script.';
    PRINT 'You can find your tenant_id in the PayrollControlDB.dbo.tenants table.';
END

-- To create levels for all active tenants, you can use this approach:
/*
DECLARE @tenant_id UNIQUEIDENTIFIER;
DECLARE tenant_cursor CURSOR FOR
    SELECT id FROM PayrollControlDB.dbo.tenants WHERE is_active = 1;

OPEN tenant_cursor;
FETCH NEXT FROM tenant_cursor INTO @tenant_id;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT 1 FROM org_levels WHERE tenant_id = @tenant_id)
    BEGIN
        INSERT INTO org_levels (tenant_id, [key], display_name, level_order, is_active)
        VALUES 
            (@tenant_id, 'region', 'Region', 1, 1),
            (@tenant_id, 'factory', 'Factory', 2, 1),
            (@tenant_id, 'section', 'Section', 3, 1),
            (@tenant_id, 'department', 'Department', 4, 1),
            (@tenant_id, 'work_center', 'Work Center', 5, 1);
    END
    
    FETCH NEXT FROM tenant_cursor INTO @tenant_id;
END

CLOSE tenant_cursor;
DEALLOCATE tenant_cursor;
*/

