-- Migration: Upgrade Job Scheduler to support professional recurrence rules
-- This migration modifies the scheduled_jobs table to support cron, monthly, weekly, biweekly, and custom recurrence patterns

-- Step 1: Add new columns for recurrence support
ALTER TABLE scheduled_jobs
ADD recurrence_type NVARCHAR(20) NOT NULL DEFAULT 'monthly',
    day_of_month INT NULL,
    weekday INT NULL, -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    week_interval INT NULL, -- For biweekly: every X weeks
    month_interval INT NULL, -- For custom monthly intervals
    timezone NVARCHAR(100) NOT NULL DEFAULT 'UTC';

-- Step 2: Update existing cron_expression column (it was already nullable, but ensure it's properly set)
-- No change needed if column already exists

-- Step 3: Migrate existing data
-- For existing jobs with interval_minutes, convert to appropriate recurrence_type
-- This is a best-effort migration - you may need to manually review and adjust
UPDATE scheduled_jobs
SET recurrence_type = CASE
    WHEN interval_minutes = 60 THEN 'weekly' -- Hourly jobs -> weekly (adjust as needed)
    WHEN interval_minutes = 1440 THEN 'monthly' -- Daily jobs -> monthly (adjust as needed)
    WHEN interval_minutes BETWEEN 10080 AND 44640 THEN 'monthly' -- Weekly to monthly range
    ELSE 'custom'
END,
    day_of_month = CASE
    WHEN interval_minutes = 1440 THEN 1 -- Daily -> 1st of month
    ELSE NULL
END,
    weekday = CASE
    WHEN interval_minutes = 10080 THEN 1 -- Weekly -> Monday
    ELSE NULL
END
WHERE recurrence_type = 'monthly' -- Only update if default was applied
AND interval_minutes IS NOT NULL;

-- Step 4: Make recurrence_type NOT NULL (after data migration)
-- Already done in Step 1

-- Step 5: Add indexes for better query performance
CREATE INDEX IX_scheduled_jobs_recurrence_type 
ON scheduled_jobs(recurrence_type, is_active, next_run_at)
WHERE is_active = 1;

-- Step 6: Remove interval_minutes column (after migration is verified)
-- Uncomment the following line after verifying the migration worked correctly:
-- ALTER TABLE scheduled_jobs DROP COLUMN interval_minutes;

-- Note: Keep interval_minutes for now to allow rollback if needed
-- You can drop it in a separate migration after confirming everything works

