-- Table: dbo.auth_audit_log
-- Generated from PayrollControlDB
-- Date: 2025-12-24

USE PayrollControlDB;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[auth_audit_log]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[auth_audit_log] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [email] NVARCHAR(255) NOT NULL,
        [success] BIT NOT NULL,
        [reason] NVARCHAR(500) NULL,
        [ip] NVARCHAR(50) NULL,
        [user_agent] NVARCHAR(500) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_auth_audit_log] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    
    -- Create indexes for performance
    CREATE NONCLUSTERED INDEX [IX_auth_audit_log_email] ON [dbo].[auth_audit_log] ([email] ASC);
    CREATE NONCLUSTERED INDEX [IX_auth_audit_log_created_at] ON [dbo].[auth_audit_log] ([created_at] DESC);
    CREATE NONCLUSTERED INDEX [IX_auth_audit_log_success] ON [dbo].[auth_audit_log] ([success] ASC);
    
    PRINT 'Table [dbo].[auth_audit_log] created successfully';
END
ELSE
BEGIN
    PRINT 'Table [dbo].[auth_audit_log] already exists';
END
GO
