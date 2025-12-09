export interface JobRun {
  id: number;
  job_id: number;
  tenant_id: string | null;
  started_at: Date;
  finished_at: Date | null;
  status: 'success' | 'failed' | 'running';
  error_message: string | null;
  run_duration_ms: number | null;
  created_at: Date;
}

