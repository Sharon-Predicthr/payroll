export type RecurrenceType = 'cron' | 'monthly' | 'weekly' | 'biweekly' | 'custom';

export class CreateJobDto {
  tenant_id?: string | null;
  name: string;
  job_type: string;
  recurrence_type: RecurrenceType;
  cron_expression?: string | null; // Required if recurrence_type = 'cron'
  day_of_month?: number | null; // 1-31, required if recurrence_type = 'monthly'
  weekday?: number | null; // 0-6 (0=Sunday), required if recurrence_type = 'weekly'
  week_interval?: number | null; // Required if recurrence_type = 'biweekly'
  month_interval?: number | null; // Optional for monthly recurrence
  timezone?: string; // Default: 'UTC'
  is_active?: boolean;
  payload_json?: any;
  // Legacy field (for backward compatibility during migration)
  interval_minutes?: number | null;
}

