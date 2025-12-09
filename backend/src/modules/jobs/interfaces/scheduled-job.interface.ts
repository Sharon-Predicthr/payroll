export type RecurrenceType = 'cron' | 'monthly' | 'weekly' | 'biweekly' | 'custom';

export interface ScheduledJob {
  id: number;
  tenant_id: string | null;
  name: string;
  job_type: string;
  recurrence_type: RecurrenceType;
  cron_expression: string | null;
  day_of_month: number | null; // 1-31
  weekday: number | null; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  week_interval: number | null; // For biweekly: every X weeks
  month_interval: number | null; // For custom monthly intervals
  timezone: string; // e.g., 'UTC', 'America/New_York', 'Asia/Jerusalem'
  next_run_at: Date;
  is_active: boolean;
  last_run_at: Date | null;
  last_status: string | null;
  last_error: string | null;
  payload_json: any | null;
  created_at: Date;
  updated_at: Date;
  // Legacy field (may still exist in DB during migration)
  interval_minutes?: number | null;
}

