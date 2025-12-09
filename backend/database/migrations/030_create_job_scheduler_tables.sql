-- Migration: Create job scheduler tables in Control DB
-- This migration creates tables for scheduling and running background jobs

-- Table: scheduled_jobs
-- Stores job definitions and scheduling information
CREATE TABLE scheduled_jobs (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NULL,           -- NULL = global job, not per-tenant
    name NVARCHAR(200) NOT NULL,               -- human readable name
    job_type NVARCHAR(50) NOT NULL,            -- e.g. PAYROLL_DUE_REMINDER, DOCUMENT_EXPIRY_CHECK
    cron_expression NVARCHAR(100) NULL,        -- for future use (leave NULL for now)
    interval_minutes INT NULL,            -- how often it should run (e.g. 60 = every hour)
    next_run_at DATETIME2 NOT NULL,           -- next scheduled timestamp in UTC
    is_active BIT NOT NULL DEFAULT 1,
    last_run_at DATETIME2 NULL,
    last_status NVARCHAR(20) NULL,            -- e.g. "success", "failed"
    last_error NVARCHAR(MAX) NULL,
    payload_json NVARCHAR(MAX) NULL,          -- JSON with parameters / config
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Index for efficient querying of due jobs
CREATE INDEX IX_scheduled_jobs_active_next_run 
ON scheduled_jobs(is_active, next_run_at)
WHERE is_active = 1;

-- Table: job_runs
-- Stores execution history for each job run
CREATE TABLE job_runs (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    job_id BIGINT NOT NULL,                    -- FK to scheduled_jobs.id
    tenant_id UNIQUEIDENTIFIER NULL,
    started_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    finished_at DATETIME2 NULL,
    status NVARCHAR(20) NOT NULL,             -- "success", "failed", "running"
    error_message NVARCHAR(MAX) NULL,
    run_duration_ms INT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Index for efficient querying of job run history
CREATE INDEX IX_job_runs_job_started 
ON job_runs(job_id, started_at DESC);

-- Foreign key constraint (optional, can be added if needed)
-- ALTER TABLE job_runs ADD CONSTRAINT FK_job_runs_job 
--     FOREIGN KEY (job_id) REFERENCES scheduled_jobs(id) ON DELETE CASCADE;

