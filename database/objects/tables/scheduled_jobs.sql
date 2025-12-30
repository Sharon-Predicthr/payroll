-- Table: dbo.scheduled_jobs
-- Generated from PayrollControlDB
-- Date: 2025-12-24

USE PayrollControlDB;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[scheduled_jobs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[scheduled_jobs] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [name] NVARCHAR(255) NOT NULL,
        [cron_expression] NVARCHAR(100) NOT NULL,
        [is_active] BIT NOT NULL DEFAULT 1,
        [last_run] DATETIME2 NULL,
        [next_run] DATETIME2 NULL,
        [next_run_at] DATETIME2 NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_scheduled_jobs] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    
    -- Create index on is_active for filtering active jobs
    CREATE NONCLUSTERED INDEX [IX_scheduled_jobs_is_active] ON [dbo].[scheduled_jobs] ([is_active] ASC);
    CREATE NONCLUSTERED INDEX [IX_scheduled_jobs_next_run_at] ON [dbo].[scheduled_jobs] ([next_run_at] ASC);
    
    PRINT 'Table [dbo].[scheduled_jobs] created successfully';
END
ELSE
BEGIN
    PRINT 'Table [dbo].[scheduled_jobs] already exists';
END
GO
