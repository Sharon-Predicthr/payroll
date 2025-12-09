export type RecurrenceType = 'cron' | 'monthly' | 'weekly' | 'biweekly' | 'custom';

export class UpdateJobDto {
  name?: string;
  job_type?: string;
  recurrence_type?: RecurrenceType;
  cron_expression?: string | null;
  day_of_month?: number | null;
  weekday?: number | null;
  week_interval?: number | null;
  month_interval?: number | null;
  timezone?: string;
  is_active?: boolean;
  next_run_at?: Date;
  payload_json?: any;
  // Legacy field (for backward compatibility during migration)
  interval_minutes?: number | null;
}

