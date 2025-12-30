-- Table: dbo.tenant_user_links
-- Generated from PayrollControlDB
-- Date: 2025-12-24

USE PayrollControlDB;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tenant_user_links]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[tenant_user_links] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [tenant_id] UNIQUEIDENTIFIER NOT NULL,
        [user_id] INT NOT NULL,
        [role] NVARCHAR(50) NOT NULL DEFAULT 'user',
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_tenant_user_links] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_tenant_user_links_tenants] FOREIGN KEY ([tenant_id]) 
            REFERENCES [dbo].[tenants] ([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_tenant_user_links_app_users] FOREIGN KEY ([user_id]) 
            REFERENCES [dbo].[app_users] ([id]) ON DELETE CASCADE
    );
    
    -- Create indexes
    CREATE NONCLUSTERED INDEX [IX_tenant_user_links_tenant_id] ON [dbo].[tenant_user_links] ([tenant_id] ASC);
    CREATE NONCLUSTERED INDEX [IX_tenant_user_links_user_id] ON [dbo].[tenant_user_links] ([user_id] ASC);
    
    PRINT 'Table [dbo].[tenant_user_links] created successfully';
END
ELSE
BEGIN
    PRINT 'Table [dbo].[tenant_user_links] already exists';
END
GO
