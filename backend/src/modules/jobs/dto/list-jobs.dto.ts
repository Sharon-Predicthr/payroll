export class ListJobsDto {
  tenant_id?: string | null;
  job_type?: string;
  is_active?: boolean;
  page?: number = 1;
  limit?: number = 50;
}

