-- Migration: Create a test job for PAYROLL_DUE_REMINDER
-- This creates a test job that runs every minute for testing purposes
-- Replace @TENANT_ID with your actual tenant ID

-- Example: Create a test job for tenant ACME
-- First, get the tenant ID:
-- DECLARE @TenantId UNIQUEIDENTIFIER = (SELECT id FROM tenants WHERE code = 'ACME' AND is_active = 1);

-- If you want to test with a specific tenant, uncomment and modify:
/*
DECLARE @TenantId UNIQUEIDENTIFIER = (SELECT id FROM tenants WHERE code = 'ACME' AND is_active = 1);

IF @TenantId IS NOT NULL
BEGIN
    INSERT INTO scheduled_jobs (
        tenant_id, 
        name, 
        job_type, 
        recurrence_type,
        cron_expression,
        day_of_month,
        weekday,
        week_interval,
        month_interval,
        timezone,
        next_run_at, 
        is_active, 
        payload_json
    )
    VALUES (
        @TenantId,
        'Test Payroll Due Reminder - Every Minute',
        'PAYROLL_DUE_REMINDER',
        'cron', -- Use cron for testing (runs every minute)
        '*/1 * * * *', -- Every minute (for testing only!)
        NULL,
        NULL,
        NULL,
        NULL,
        'UTC',
        DATEADD(minute, 1, SYSUTCDATETIME()), -- Run in 1 minute
        1,
        '{"daysBeforeDue": 3}' -- Check for payroll due in 3 days
    );
    
    PRINT 'Test job created successfully for tenant: ' + CAST(@TenantId AS NVARCHAR(50));
END
ELSE
BEGIN
    PRINT 'Tenant not found. Please check the tenant code.';
END
*/

-- Alternative: Create a test job that runs every 5 minutes (more reasonable for testing)
-- This uses cron expression: "*/5 * * * *" (every 5 minutes)
/*
DECLARE @TenantId UNIQUEIDENTIFIER = (SELECT id FROM tenants WHERE code = 'ACME' AND is_active = 1);

IF @TenantId IS NOT NULL
BEGIN
    INSERT INTO scheduled_jobs (
        tenant_id, 
        name, 
        job_type, 
        recurrence_type,
        cron_expression,
        timezone,
        next_run_at, 
        is_active, 
        payload_json
    )
    VALUES (
        @TenantId,
        'Test Payroll Due Reminder - Every 5 Minutes',
        'PAYROLL_DUE_REMINDER',
        'cron',
        '*/5 * * * *', -- Every 5 minutes
        'UTC',
        DATEADD(minute, 5, SYSUTCDATETIME()),
        1,
        '{"daysBeforeDue": 3}'
    );
    
    PRINT 'Test job created successfully for tenant: ' + CAST(@TenantId AS NVARCHAR(50));
END
*/

-- For immediate testing, you can also manually set next_run_at to a few seconds in the future:
-- UPDATE scheduled_jobs SET next_run_at = DATEADD(second, 30, SYSUTCDATETIME()) WHERE name LIKE 'Test%';

