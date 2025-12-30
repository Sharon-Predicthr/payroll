-- Table: dbo.app_users
-- Generated from PayrollControlDB
-- Date: 2025-12-24

USE PayrollControlDB;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[app_users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[app_users] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [email] NVARCHAR(255) NOT NULL,
        [password_hash] NVARCHAR(255) NOT NULL,
        [full_name] NVARCHAR(255) NULL,
        [is_active] BIT NOT NULL DEFAULT 1,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_app_users] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    
    -- Create unique index on email
    CREATE UNIQUE NONCLUSTERED INDEX [IX_app_users_email] ON [dbo].[app_users] ([email] ASC);
    
    PRINT 'Table [dbo].[app_users] created successfully';
END
ELSE
BEGIN
    PRINT 'Table [dbo].[app_users] already exists';
END
GO
