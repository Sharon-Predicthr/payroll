# Job Scheduler Recurrence Upgrade

This document describes the upgrade to professional recurrence rules for the Job Scheduler.

## Overview

The Job Scheduler now supports professional recurrence patterns used in payroll systems:
- **Cron expressions** (standard UNIX cron)
- **Monthly execution** (e.g., day_of_month = 1 → run on 1st of every month)
- **Weekly execution** (weekday 0–6)
- **Biweekly execution** (every X weeks)
- **Semi-monthly** (handled by two monthly jobs)
- **Timezone-aware scheduling** per tenant
- **Flexible X-month intervals**

## Database Changes

### Migration: `032_upgrade_job_scheduler_recurrence.sql`

The `scheduled_jobs` table has been enhanced with:

**New Columns:**
- `recurrence_type` NVARCHAR(20) NOT NULL - Type: 'cron', 'monthly', 'weekly', 'biweekly', 'custom'
- `cron_expression` NVARCHAR(100) NULL - Cron expression (required if recurrence_type = 'cron')
- `day_of_month` INT NULL - Day of month 1-31 (required if recurrence_type = 'monthly')
- `weekday` INT NULL - 0=Sunday, 1=Monday, ..., 6=Saturday (required if recurrence_type = 'weekly')
- `week_interval` INT NULL - Every X weeks (required if recurrence_type = 'biweekly')
- `month_interval` INT NULL - Every X months (optional for monthly recurrence)
- `timezone` NVARCHAR(100) NOT NULL DEFAULT 'UTC' - Timezone for scheduling

**Deprecated:**
- `interval_minutes` - Still exists for backward compatibility but should not be used for new jobs

## Recurrence Types

### 1. Cron (`recurrence_type = 'cron'`)

Uses standard UNIX cron expressions with timezone support.

**Required fields:**
- `cron_expression` - Valid cron expression (e.g., "0 9 * * 1" = Every Monday at 9 AM)
- `timezone` - Timezone for the cron expression

**Example:**
```json
{
  "recurrence_type": "cron",
  "cron_expression": "0 9 * * 1",
  "timezone": "America/New_York"
}
```

### 2. Monthly (`recurrence_type = 'monthly'`)

Runs on a specific day of the month.

**Required fields:**
- `day_of_month` - Day of month (1-31)
- `timezone` - Timezone for scheduling

**Optional fields:**
- `month_interval` - Every X months (default: 1)

**Example:**
```json
{
  "recurrence_type": "monthly",
  "day_of_month": 1,
  "month_interval": 1,
  "timezone": "UTC"
}
```

### 3. Weekly (`recurrence_type = 'weekly'`)

Runs on a specific weekday.

**Required fields:**
- `weekday` - 0=Sunday, 1=Monday, ..., 6=Saturday
- `timezone` - Timezone for scheduling

**Example:**
```json
{
  "recurrence_type": "weekly",
  "weekday": 1,
  "timezone": "America/New_York"
}
```

### 4. Biweekly (`recurrence_type = 'biweekly'`)

Runs every X weeks from the last run.

**Required fields:**
- `week_interval` - Number of weeks (e.g., 2 for biweekly)
- `timezone` - Timezone for scheduling

**Example:**
```json
{
  "recurrence_type": "biweekly",
  "week_interval": 2,
  "timezone": "UTC"
}
```

### 5. Custom (`recurrence_type = 'custom'`)

Placeholder for future custom recurrence patterns.

## API Usage

### Create Job with Monthly Recurrence

```bash
POST /api/jobs
{
  "name": "Monthly Payroll Run",
  "job_type": "PAYROLL_DUE_REMINDER",
  "recurrence_type": "monthly",
  "day_of_month": 1,
  "month_interval": 1,
  "timezone": "America/New_York",
  "is_active": true,
  "payload_json": {"daysBeforeDue": 3}
}
```

### Create Job with Cron Expression

```bash
POST /api/jobs
{
  "name": "Daily Document Check",
  "job_type": "DOCUMENT_EXPIRY_CHECK",
  "recurrence_type": "cron",
  "cron_expression": "0 8 * * *",
  "timezone": "UTC",
  "is_active": true,
  "payload_json": {"daysBeforeExpiry": 30}
}
```

### Create Job with Weekly Recurrence

```bash
POST /api/jobs
{
  "name": "Weekly Integration Check",
  "job_type": "INTEGRATION_STATUS_CHECK",
  "recurrence_type": "weekly",
  "weekday": 1,
  "timezone": "America/New_York",
  "is_active": true
}
```

### Update Job Recurrence

```bash
PATCH /api/jobs/:id
{
  "recurrence_type": "monthly",
  "day_of_month": 15,
  "timezone": "Asia/Jerusalem"
}
```

When recurrence fields are updated, `next_run_at` is automatically recalculated.

## Implementation Details

### JobsRecurrenceService

New service (`jobs-recurrence.service.ts`) that:
- Calculates `next_run_at` based on recurrence type
- Validates recurrence configuration
- Handles timezone conversions using Luxon

### Timezone Support

All date calculations are timezone-aware:
- Jobs are scheduled in their specified timezone
- `next_run_at` is stored in UTC in the database
- Comparisons are done in UTC for consistency

### Next Run Calculation

The `calculateNextRunAt()` method:
1. Determines recurrence type
2. Uses appropriate calculation method
3. Converts to UTC for storage
4. Handles edge cases (e.g., Feb 30 → Feb 28/29)

## Migration Guide

### For Existing Jobs

1. Run migration `032_upgrade_job_scheduler_recurrence.sql`
2. Existing jobs with `interval_minutes` will be migrated automatically (best-effort)
3. Review and adjust migrated jobs as needed
4. Update jobs via API to use new recurrence fields

### For New Jobs

Always use the new recurrence fields:
- Set `recurrence_type` explicitly
- Provide required fields for the recurrence type
- Set `timezone` appropriately

## Dependencies

New dependencies added:
- `cron-parser` - For parsing cron expressions
- `luxon` - For timezone-aware date calculations

Install with:
```bash
npm install cron-parser luxon
```

## Examples

### Semi-Monthly Payroll

Create two monthly jobs:
1. 1st of month
2. 15th of month

```bash
# Job 1: 1st of month
POST /api/jobs
{
  "name": "Semi-Monthly Payroll - 1st",
  "job_type": "PAYROLL_DUE_REMINDER",
  "recurrence_type": "monthly",
  "day_of_month": 1,
  "timezone": "America/New_York"
}

# Job 2: 15th of month
POST /api/jobs
{
  "name": "Semi-Monthly Payroll - 15th",
  "job_type": "PAYROLL_DUE_REMINDER",
  "recurrence_type": "monthly",
  "day_of_month": 15,
  "timezone": "America/New_York"
}
```

### Quarterly Reports

```bash
POST /api/jobs
{
  "name": "Quarterly Report",
  "job_type": "REPORT_GENERATION",
  "recurrence_type": "monthly",
  "day_of_month": 1,
  "month_interval": 3,
  "timezone": "UTC"
}
```

## Validation

The system validates:
- Required fields for each recurrence type
- Valid cron expressions
- Day of month (1-31)
- Weekday (0-6)
- Positive intervals
- Valid timezone names

Invalid configurations will throw `InternalServerErrorException` with descriptive messages.

