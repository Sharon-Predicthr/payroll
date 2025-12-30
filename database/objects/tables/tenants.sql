-- Table: dbo.tenants
-- Generated from PayrollControlDB
-- Date: 2025-12-24

USE PayrollControlDB;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tenants]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[tenants] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [code] NVARCHAR(50) NOT NULL,
        [name] NVARCHAR(255) NOT NULL,
        [db_host] NVARCHAR(255) NULL,
        [db_port] INT NULL,
        [db_name] NVARCHAR(255) NULL,
        [db_user] NVARCHAR(255) NULL,
        [db_password_enc] NVARCHAR(MAX) NULL,
        [is_active] BIT NOT NULL DEFAULT 1,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_tenants] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    
    -- Create unique index on code
    CREATE UNIQUE NONCLUSTERED INDEX [IX_tenants_code] ON [dbo].[tenants] ([code] ASC);
    
    PRINT 'Table [dbo].[tenants] created successfully';
END
ELSE
BEGIN
    PRINT 'Table [dbo].[tenants] already exists';
END
GO
