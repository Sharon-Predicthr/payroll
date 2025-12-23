-- Add payslip_template column to tenants table in Control DB
-- This allows each company to choose their preferred payslip template
-- Values: 'template1' (default, existing template) or 'template2' (new Israeli standard format)

USE [PayrollControlDB];
GO

-- Check if column exists, if not add it
IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'tenants'
      AND COLUMN_NAME = 'payslip_template'
)
BEGIN
    ALTER TABLE tenants
    ADD payslip_template NVARCHAR(50) NOT NULL DEFAULT 'template1';
    
    PRINT 'Column payslip_template added to tenants table with default value template1';
END
ELSE
BEGIN
    PRINT 'Column payslip_template already exists in tenants table';
END
GO

-- Add comment/description (update if exists, add if not)
IF EXISTS (
    SELECT 1
    FROM sys.extended_properties
    WHERE major_id = OBJECT_ID('dbo.tenants')
      AND minor_id = COLUMNPROPERTY(OBJECT_ID('dbo.tenants'), 'payslip_template', 'ColumnId')
      AND name = 'MS_Description'
)
BEGIN
    EXEC sp_updateextendedproperty 
        @name = N'MS_Description',
        @value = N'Payslip template preference: template1 (default) or template2 (Israeli standard format)',
        @level0type = N'SCHEMA', @level0name = N'dbo',
        @level1type = N'TABLE', @level1name = N'tenants',
        @level2type = N'COLUMN', @level2name = N'payslip_template';
    PRINT 'Extended property MS_Description updated for payslip_template column';
END
ELSE
BEGIN
    EXEC sp_addextendedproperty 
        @name = N'MS_Description',
        @value = N'Payslip template preference: template1 (default) or template2 (Israeli standard format)',
        @level0type = N'SCHEMA', @level0name = N'dbo',
        @level1type = N'TABLE', @level1name = N'tenants',
        @level2type = N'COLUMN', @level2name = N'payslip_template';
    PRINT 'Extended property MS_Description added for payslip_template column';
END
GO

