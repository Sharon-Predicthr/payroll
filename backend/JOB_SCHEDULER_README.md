# Job Scheduler System

This document describes the centralized Job Scheduler system for the Payroll multi-tenant platform.

## Overview

The Job Scheduler runs inside NestJS and:
- Stores scheduled jobs in the Control DB
- Supports per-tenant and global jobs
- Runs jobs automatically every minute
- Generates notifications for users when conditions are met

## Architecture

### Database Tables

1. **scheduled_jobs** - Stores job definitions
   - `id` - Primary key
   - `tenant_id` - NULL for global jobs, UUID for tenant-specific jobs
   - `name` - Human-readable job name
   - `job_type` - Type of job (e.g., PAYROLL_DUE_REMINDER)
   - `interval_minutes` - How often to run (e.g., 60 = every hour)
   - `next_run_at` - Next scheduled execution time
   - `is_active` - Whether the job is enabled
   - `payload_json` - JSON configuration for the job

2. **job_runs** - Stores execution history
   - `id` - Primary key
   - `job_id` - Foreign key to scheduled_jobs
   - `started_at` - When execution started
   - `finished_at` - When execution completed
   - `status` - "success", "failed", or "running"
   - `error_message` - Error details if failed

### Module Structure

- `jobs.module.ts` - NestJS module
- `jobs.service.ts` - CRUD operations for jobs
- `jobs.runner.service.ts` - Scheduler loop and job execution
- `jobs.controller.ts` - REST API for managing jobs

## Setup

### 1. Install Dependencies

```bash
npm install @nestjs/schedule
```

### 2. Run Database Migration

Execute the SQL migration:
```sql
-- Run: backend/database/migrations/030_create_job_scheduler_tables.sql
```

### 3. Environment Variables

Ensure these are set in `.env`:
```
DB_SERVER=your-server
DB_NAME=PayrollControlDB
DB_USER=your-user
DB_PASSWORD=your-password
```

## Job Types

### PAYROLL_DUE_REMINDER
- Checks for upcoming payroll periods
- Creates notifications for admin users
- Configuration: `{"daysBeforeDue": 3}`

### DOCUMENT_EXPIRY_CHECK
- Checks for expiring employee documents
- Creates notifications for admin users
- Configuration: `{"daysBeforeExpiry": 30}`

### INTEGRATION_STATUS_CHECK
- Checks integration status
- Creates system notifications on failure
- Configuration: `{}`

## API Endpoints

All endpoints require JWT authentication.

### List Jobs
```
GET /api/jobs?tenant_id=xxx&job_type=PAYROLL_DUE_REMINDER&is_active=true&page=1&limit=50
```

### Get Job
```
GET /api/jobs/:id
```

### Get Job Runs
```
GET /api/jobs/:id/runs?limit=50
```

### Create Job
```
POST /api/jobs
Body: {
  "tenant_id": "uuid-or-null",
  "name": "Payroll Due Reminder",
  "job_type": "PAYROLL_DUE_REMINDER",
  "interval_minutes": 60,
  "is_active": true,
  "payload_json": {"daysBeforeDue": 3}
}
```

### Update Job
```
PATCH /api/jobs/:id
Body: {
  "is_active": false,
  "interval_minutes": 120
}
```

## Seeding Initial Jobs

See `backend/database/migrations/031_seed_initial_jobs.sql` for example SQL to create initial jobs.

Example for creating a job via API:
```bash
curl -X POST http://localhost:4000/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Payroll Due Reminder",
    "job_type": "PAYROLL_DUE_REMINDER",
    "interval_minutes": 60,
    "is_active": true,
    "payload_json": {"daysBeforeDue": 3}
  }'
```

## How It Works

1. **Scheduler Loop**: `JobsRunnerService` runs every 60 seconds via `@Interval(60000)`
2. **Find Due Jobs**: Queries `scheduled_jobs` for jobs where `next_run_at <= now` and `is_active = 1`
3. **Execute Jobs**: For each due job:
   - Creates a `job_runs` record with status "running"
   - Dispatches to appropriate handler based on `job_type`
   - Updates `job_runs` with result (success/failed)
   - Updates `scheduled_jobs` with `next_run_at`, `last_status`, `last_error`
4. **Notifications**: Job handlers create notifications via `NotificationsService` when conditions are met

## Adding New Job Types

1. Add a new case in `jobs.runner.service.ts` → `dispatchJob()`:
```typescript
case 'YOUR_JOB_TYPE':
  await this.handleYourJobType(job);
  break;
```

2. Implement the handler:
```typescript
private async handleYourJobType(job: ScheduledJob): Promise<void> {
  // Your logic here
  // Access tenant DB if needed: await this.tenantResolverService.getTenantPoolById(job.tenant_id)
  // Create notifications: await this.notificationsService.createNotification(...)
}
```

## Multi-Tenant Behavior

- **Control DB**: Always used for `scheduled_jobs` and `job_runs` tables
- **Tenant DB**: Used only for per-tenant jobs (when `job.tenant_id IS NOT NULL`)
- **Global Jobs**: Jobs with `tenant_id = NULL` run without tenant DB connection

## Monitoring

- Check `job_runs` table for execution history
- Check `scheduled_jobs.last_status` and `last_error` for job health
- Logs are written by `JobsRunnerService` for each execution

## Troubleshooting

### Jobs not running
- Check that `ScheduleModule.forRoot()` is imported in `AppModule`
- Check that `JobsModule` is imported in `AppModule`
- Verify `is_active = 1` in `scheduled_jobs`
- Check `next_run_at` is in the past
- Check backend logs for errors

### Job execution fails
- Check `job_runs.error_message` for details
- Check `scheduled_jobs.last_error` for last failure
- Verify tenant DB connection if job requires tenant_id
- Check that required tables exist in tenant DB

### Notifications not created
- Verify `NotificationsService` is properly injected
- Check that admin users exist in `app_users` table
- Check backend logs for notification creation errors

