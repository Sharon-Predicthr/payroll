# Testing the Job Scheduler

This guide explains how to test that the job scheduler is working correctly.

## Quick Test Plan

1. **Create a test job** (via API or SQL)
2. **Verify job execution** (check logs)
3. **Check notifications** (view in UI)

## Method 1: Create Test Job via API

### Step 1: Get your JWT token
Login to get your authentication token.

### Step 2: Create a test job

```bash
POST http://localhost:4000/api/jobs
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Test Payroll Reminder - Every 5 Minutes",
  "job_type": "PAYROLL_DUE_REMINDER",
  "recurrence_type": "cron",
  "cron_expression": "*/5 * * * *",
  "timezone": "UTC",
  "is_active": true,
  "payload_json": {
    "daysBeforeDue": 3
  }
}
```

**Note:** Replace `tenant_id` will be automatically set from your JWT token.

### Step 3: For immediate testing (run in 30 seconds)

After creating the job, update it to run soon:

```bash
PATCH http://localhost:4000/api/jobs/{job_id}
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "next_run_at": "2025-12-08T14:00:00Z"  // Set to 30 seconds from now
}
```

Or use SQL:
```sql
UPDATE scheduled_jobs 
SET next_run_at = DATEADD(second, 30, SYSUTCDATETIME()) 
WHERE id = {job_id};
```

## Method 2: Create Test Job via SQL

Run the SQL script in `backend/database/migrations/033_create_test_job.sql`:

1. Open SQL Server Management Studio
2. Connect to your Control DB
3. Update the tenant code in the script (replace 'ACME' with your tenant code)
4. Execute the script

Example:
```sql
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
        DATEADD(minute, 1, SYSUTCDATETIME()), -- Run in 1 minute
        1,
        '{"daysBeforeDue": 3}'
    );
    
    PRINT 'Test job created successfully!';
END
```

## Verify Job Execution

### Check Backend Logs

Watch the backend terminal for:
- `[JobsRunnerService] Found X job(s) due to run`
- `[JobsRunnerService] Executing job X (Job Name)`
- `[PAYROLL_DUE_REMINDER] Processing job X for tenant...`
- `[PAYROLL_DUE_REMINDER] Created notification for user...`
- `[JobsRunnerService] Job X completed successfully`

### Check Database

Query the `job_runs` table:
```sql
SELECT TOP 10 
    jr.id,
    jr.job_id,
    sj.name as job_name,
    jr.started_at,
    jr.finished_at,
    jr.status,
    jr.error_message,
    jr.run_duration_ms
FROM job_runs jr
INNER JOIN scheduled_jobs sj ON jr.job_id = sj.id
ORDER BY jr.started_at DESC;
```

### Check Job Status

```sql
SELECT 
    id,
    name,
    job_type,
    recurrence_type,
    next_run_at,
    last_run_at,
    last_status,
    last_error,
    is_active
FROM scheduled_jobs
WHERE name LIKE 'Test%'
ORDER BY created_at DESC;
```

## Verify Notifications

### Method 1: Check Notifications UI

1. Login to the frontend
2. Click the notification bell icon (top right)
3. You should see notifications with:
   - Title: "Payroll Due Reminder (Test)" or "Payroll Due Reminder"
   - Type: "payroll"
   - Message about the job execution

### Method 2: Check Database

```sql
SELECT TOP 10
    id,
    tenant_id,
    user_id,
    type,
    title,
    message,
    is_read,
    created_at
FROM notifications
WHERE type = 'payroll'
ORDER BY created_at DESC;
```

## Troubleshooting

### Job not running?

1. **Check if job is active:**
   ```sql
   SELECT id, name, is_active, next_run_at FROM scheduled_jobs WHERE id = {job_id};
   ```

2. **Check if next_run_at is in the past:**
   ```sql
   SELECT id, name, next_run_at, GETDATE() as now 
   FROM scheduled_jobs 
   WHERE id = {job_id} AND next_run_at <= GETDATE();
   ```

3. **Check backend logs for errors:**
   - Look for `[JobsRunnerService] Error in job scan`
   - Check for database connection errors

### No notifications created?

1. **Check if admin users exist:**
   ```sql
   SELECT id, email, role, tenant_id, is_active 
   FROM app_users 
   WHERE tenant_id = '{tenant_id}' 
     AND (role = 'admin' OR role = 'super_admin') 
     AND is_active = 1;
   ```

2. **Check job execution logs:**
   - Look for `[PAYROLL_DUE_REMINDER] No admin users found`
   - Check for notification creation errors

3. **Manually trigger notification creation:**
   ```sql
   -- Get a user ID from app_users
   DECLARE @UserId UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM app_users WHERE tenant_id = '{tenant_id}' AND is_active = 1);
   DECLARE @TenantId UNIQUEIDENTIFIER = '{tenant_id}';
   
   -- This will be done automatically by the job, but you can test manually
   ```

### Job runs but no notifications in UI?

1. **Check notification bell:**
   - Make sure you're logged in as the user who should receive notifications
   - Check if notifications are marked as read
   - Refresh the page

2. **Check notification API:**
   ```bash
   GET http://localhost:3000/api/notifications
   Authorization: Bearer YOUR_TOKEN
   ```

## Test Scenarios

### Scenario 1: Test with Cron (Every Minute)
```json
{
  "name": "Test - Every Minute",
  "job_type": "PAYROLL_DUE_REMINDER",
  "recurrence_type": "cron",
  "cron_expression": "*/1 * * * *",
  "timezone": "UTC"
}
```
**Warning:** This creates a notification every minute! Use only for quick testing.

### Scenario 2: Test with Monthly
```json
{
  "name": "Test - Monthly on 1st",
  "job_type": "PAYROLL_DUE_REMINDER",
  "recurrence_type": "monthly",
  "day_of_month": 1,
  "timezone": "UTC"
}
```

### Scenario 3: Test with Weekly
```json
{
  "name": "Test - Every Monday",
  "job_type": "PAYROLL_DUE_REMINDER",
  "recurrence_type": "weekly",
  "weekday": 1,
  "timezone": "UTC"
}
```

## Expected Behavior

When a job runs successfully:
1. ✅ Job appears in `job_runs` table with status "success"
2. ✅ Notification appears in `notifications` table
3. ✅ Notification appears in UI notification bell
4. ✅ `scheduled_jobs.last_run_at` is updated
5. ✅ `scheduled_jobs.next_run_at` is recalculated
6. ✅ Backend logs show successful execution

## Cleanup

After testing, you can disable or delete test jobs:

```sql
-- Disable test jobs
UPDATE scheduled_jobs SET is_active = 0 WHERE name LIKE 'Test%';

-- Or delete them
DELETE FROM scheduled_jobs WHERE name LIKE 'Test%';
```

