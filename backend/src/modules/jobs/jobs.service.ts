import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import * as sql from 'mssql';
import { ScheduledJob } from './interfaces/scheduled-job.interface';
import { JobRun } from './interfaces/job-run.interface';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ListJobsDto } from './dto/list-jobs.dto';
import { JobsRecurrenceService } from './jobs-recurrence.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private controlPool: sql.ConnectionPool;

  constructor(private recurrenceService: JobsRecurrenceService) {}

  private parseConnectionString(connectionString: string): any {
    const config: any = { options: { trustServerCertificate: true } };
    const parts = connectionString.split(';');
    
    for (const part of parts) {
      const [key, value] = part.split('=').map(s => s.trim());
      if (!key || !value) continue;
      
      switch (key.toLowerCase()) {
        case 'server':
          config.server = value;
          break;
        case 'database':
          config.database = value;
          break;
        case 'user id':
        case 'userid':
          config.user = value;
          break;
        case 'password':
          config.password = value;
          break;
        case 'port':
          config.port = parseInt(value);
          break;
      }
    }
    
    return config;
  }

  /**
   * Get or create control database connection pool
   * Made public for use by JobsRunnerService
   */
  async ensureControlPool(): Promise<sql.ConnectionPool> {
    if (this.controlPool && this.controlPool.connected) {
      return this.controlPool;
    }

    if (!process.env.CONTROL_DB_URL) {
      throw new InternalServerErrorException(
        'Control database not configured. Please set CONTROL_DB_URL environment variable.'
      );
    }

    try {
      const config = this.parseConnectionString(process.env.CONTROL_DB_URL);
      this.controlPool = new sql.ConnectionPool(config);
      await this.controlPool.connect();
      this.logger.log('Control database connection established for jobs');
      return this.controlPool;
    } catch (error) {
      this.controlPool = null;
      this.logger.error(`Failed to connect to control database: ${error.message}`);
      throw new InternalServerErrorException(
        `Failed to connect to control database: ${error.message}`
      );
    }
  }

  private mapToJob(row: any): ScheduledJob {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      job_type: row.job_type,
      recurrence_type: row.recurrence_type || 'monthly', // Default for backward compatibility
      cron_expression: row.cron_expression,
      day_of_month: row.day_of_month,
      weekday: row.weekday,
      week_interval: row.week_interval,
      month_interval: row.month_interval,
      timezone: row.timezone || 'UTC',
      next_run_at: row.next_run_at,
      is_active: row.is_active === 1 || row.is_active === true,
      last_run_at: row.last_run_at,
      last_status: row.last_status,
      last_error: row.last_error,
      payload_json: row.payload_json ? JSON.parse(row.payload_json) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      interval_minutes: row.interval_minutes, // Legacy field
    };
  }

  private mapToJobRun(row: any): JobRun {
    return {
      id: row.id,
      job_id: row.job_id,
      tenant_id: row.tenant_id,
      started_at: row.started_at,
      finished_at: row.finished_at,
      status: row.status,
      error_message: row.error_message,
      run_duration_ms: row.run_duration_ms,
      created_at: row.created_at,
    };
  }

  /**
   * Create a new scheduled job
   */
  async createJob(dto: CreateJobDto): Promise<ScheduledJob> {
    const pool = await this.ensureControlPool();

    try {
      // Validate recurrence configuration
      this.recurrenceService.validateRecurrenceConfig(dto);

      // Create a temporary job object to calculate next_run_at
      const tempJob: Partial<ScheduledJob> = {
        recurrence_type: dto.recurrence_type,
        cron_expression: dto.cron_expression || null,
        day_of_month: dto.day_of_month || null,
        weekday: dto.weekday || null,
        week_interval: dto.week_interval || null,
        month_interval: dto.month_interval || null,
        timezone: dto.timezone || 'UTC',
        last_run_at: null,
      };

      // Calculate next run time
      const nextRunAt = this.recurrenceService.calculateNextRunAt(tempJob as ScheduledJob);

      const payloadJson = dto.payload_json ? JSON.stringify(dto.payload_json) : null;
      const timezone = dto.timezone || 'UTC';

      const result = await pool
        .request()
        .input('tenant_id', sql.UniqueIdentifier, dto.tenant_id || null)
        .input('name', sql.NVarChar(200), dto.name)
        .input('job_type', sql.NVarChar(50), dto.job_type)
        .input('recurrence_type', sql.NVarChar(20), dto.recurrence_type)
        .input('cron_expression', sql.NVarChar(100), dto.cron_expression || null)
        .input('day_of_month', sql.Int, dto.day_of_month || null)
        .input('weekday', sql.Int, dto.weekday || null)
        .input('week_interval', sql.Int, dto.week_interval || null)
        .input('month_interval', sql.Int, dto.month_interval || null)
        .input('timezone', sql.NVarChar(100), timezone)
        .input('next_run_at', sql.DateTime2, nextRunAt)
        .input('is_active', sql.Bit, dto.is_active !== false)
        .input('payload_json', sql.NVarChar(sql.MAX), payloadJson)
        .query(`
          INSERT INTO scheduled_jobs (
            tenant_id, name, job_type, recurrence_type, cron_expression,
            day_of_month, weekday, week_interval, month_interval, timezone,
            next_run_at, is_active, payload_json
          )
          OUTPUT INSERTED.*
          VALUES (
            @tenant_id, @name, @job_type, @recurrence_type, @cron_expression,
            @day_of_month, @weekday, @week_interval, @month_interval, @timezone,
            @next_run_at, @is_active, @payload_json
          )
        `);

      const job = this.mapToJob(result.recordset[0]);
      this.logger.log(`Job created: ${job.id} - ${job.name} (${job.job_type}, ${job.recurrence_type})`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to create job: ${error.message}`);
      throw new InternalServerErrorException(`Failed to create job: ${error.message}`);
    }
  }

  /**
   * Update an existing job
   */
  async updateJob(id: number, dto: UpdateJobDto): Promise<ScheduledJob> {
    const pool = await this.ensureControlPool();

    try {
      // Get existing job to merge with updates
      const existingJob = await this.getJobById(id);
      
      // Merge DTO with existing job for validation
      const mergedJob: Partial<ScheduledJob> = {
        ...existingJob,
        ...dto,
      };

      // If recurrence fields changed, validate and recalculate next_run_at
      const recurrenceChanged = 
        dto.recurrence_type !== undefined ||
        dto.cron_expression !== undefined ||
        dto.day_of_month !== undefined ||
        dto.weekday !== undefined ||
        dto.week_interval !== undefined ||
        dto.month_interval !== undefined ||
        dto.timezone !== undefined;

      if (recurrenceChanged) {
        this.recurrenceService.validateRecurrenceConfig(mergedJob);
      }

      const updates: string[] = [];
      const request = pool.request().input('id', sql.BigInt, id);

      if (dto.name !== undefined) {
        updates.push('name = @name');
        request.input('name', sql.NVarChar(200), dto.name);
      }
      if (dto.job_type !== undefined) {
        updates.push('job_type = @job_type');
        request.input('job_type', sql.NVarChar(50), dto.job_type);
      }
      if (dto.recurrence_type !== undefined) {
        updates.push('recurrence_type = @recurrence_type');
        request.input('recurrence_type', sql.NVarChar(20), dto.recurrence_type);
      }
      if (dto.cron_expression !== undefined) {
        updates.push('cron_expression = @cron_expression');
        request.input('cron_expression', sql.NVarChar(100), dto.cron_expression);
      }
      if (dto.day_of_month !== undefined) {
        updates.push('day_of_month = @day_of_month');
        request.input('day_of_month', sql.Int, dto.day_of_month);
      }
      if (dto.weekday !== undefined) {
        updates.push('weekday = @weekday');
        request.input('weekday', sql.Int, dto.weekday);
      }
      if (dto.week_interval !== undefined) {
        updates.push('week_interval = @week_interval');
        request.input('week_interval', sql.Int, dto.week_interval);
      }
      if (dto.month_interval !== undefined) {
        updates.push('month_interval = @month_interval');
        request.input('month_interval', sql.Int, dto.month_interval);
      }
      if (dto.timezone !== undefined) {
        updates.push('timezone = @timezone');
        request.input('timezone', sql.NVarChar(100), dto.timezone);
      }
      // Legacy field support
      if (dto.interval_minutes !== undefined) {
        updates.push('interval_minutes = @interval_minutes');
        request.input('interval_minutes', sql.Int, dto.interval_minutes);
      }
      if (dto.is_active !== undefined) {
        updates.push('is_active = @is_active');
        request.input('is_active', sql.Bit, dto.is_active);
      }
      if (dto.next_run_at !== undefined) {
        updates.push('next_run_at = @next_run_at');
        request.input('next_run_at', sql.DateTime2, dto.next_run_at);
      } else if (recurrenceChanged) {
        // Recalculate next_run_at if recurrence changed
        const nextRunAt = this.recurrenceService.calculateNextRunAt(mergedJob as ScheduledJob);
        updates.push('next_run_at = @next_run_at');
        request.input('next_run_at', sql.DateTime2, nextRunAt);
      }
      if (dto.payload_json !== undefined) {
        updates.push('payload_json = @payload_json');
        request.input('payload_json', sql.NVarChar(sql.MAX), dto.payload_json ? JSON.stringify(dto.payload_json) : null);
      }

      if (updates.length === 0) {
        // No updates, just return the existing job
        return existingJob;
      }

      updates.push('updated_at = SYSUTCDATETIME()');

      const result = await request.query(`
        UPDATE scheduled_jobs
        SET ${updates.join(', ')}
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

      if (result.recordset.length === 0) {
        throw new NotFoundException(`Job with ID ${id} not found`);
      }

      return this.mapToJob(result.recordset[0]);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update job: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update job: ${error.message}`);
    }
  }

  /**
   * Get job by ID
   */
  async getJobById(id: number): Promise<ScheduledJob> {
    const pool = await this.ensureControlPool();

    try {
      const result = await pool
        .request()
        .input('id', sql.BigInt, id)
        .query('SELECT * FROM scheduled_jobs WHERE id = @id');

      if (result.recordset.length === 0) {
        throw new NotFoundException(`Job with ID ${id} not found`);
      }

      return this.mapToJob(result.recordset[0]);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get job: ${error.message}`);
      throw new InternalServerErrorException(`Failed to get job: ${error.message}`);
    }
  }

  /**
   * List jobs with filtering and pagination
   */
  async listJobs(filter: ListJobsDto): Promise<{ jobs: ScheduledJob[]; total: number; page: number; limit: number; totalPages: number }> {
    const pool = await this.ensureControlPool();

    try {
      const page = filter.page || 1;
      const limit = filter.limit || 50;
      const offset = (page - 1) * limit;

      let whereClause = '1=1';
      const request = pool.request();

      if (filter.tenant_id !== undefined) {
        if (filter.tenant_id === null) {
          whereClause += ' AND tenant_id IS NULL';
        } else {
          whereClause += ' AND tenant_id = @tenant_id';
          request.input('tenant_id', sql.UniqueIdentifier, filter.tenant_id);
        }
      }
      if (filter.job_type) {
        whereClause += ' AND job_type = @job_type';
        request.input('job_type', sql.NVarChar(50), filter.job_type);
      }
      if (filter.is_active !== undefined) {
        whereClause += ' AND is_active = @is_active';
        request.input('is_active', sql.Bit, filter.is_active);
      }

      // Get total count
      const countResult = await request.query(`
        SELECT COUNT(*) as total
        FROM scheduled_jobs
        WHERE ${whereClause}
      `);
      const total = countResult.recordset[0].total;

      // Get jobs
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);
      const result = await request.query(`
        SELECT *
        FROM scheduled_jobs
        WHERE ${whereClause}
        ORDER BY created_at DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);

      const jobs = result.recordset.map(row => this.mapToJob(row));

      return {
        jobs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to list jobs: ${error.message}`);
      throw new InternalServerErrorException(`Failed to list jobs: ${error.message}`);
    }
  }

  /**
   * Get jobs that are due to run
   */
  async getDueJobs(now: Date): Promise<ScheduledJob[]> {
    const pool = await this.ensureControlPool();

    try {
      const result = await pool
        .request()
        .input('now', sql.DateTime2, now)
        .query(`
          SELECT *
          FROM scheduled_jobs
          WHERE is_active = 1
            AND next_run_at <= @now
          ORDER BY next_run_at ASC
        `);

      return result.recordset.map(row => this.mapToJob(row));
    } catch (error) {
      this.logger.error(`Failed to get due jobs: ${error.message}`);
      throw new InternalServerErrorException(`Failed to get due jobs: ${error.message}`);
    }
  }

  /**
   * Mark job run as started
   */
  async markJobRunStart(job: ScheduledJob, now: Date): Promise<JobRun> {
    const pool = await this.ensureControlPool();

    try {
      const result = await pool
        .request()
        .input('job_id', sql.BigInt, job.id)
        .input('tenant_id', sql.UniqueIdentifier, job.tenant_id || null)
        .input('started_at', sql.DateTime2, now)
        .input('status', sql.NVarChar(20), 'running')
        .query(`
          INSERT INTO job_runs (job_id, tenant_id, started_at, status)
          OUTPUT INSERTED.*
          VALUES (@job_id, @tenant_id, @started_at, @status)
        `);

      return this.mapToJobRun(result.recordset[0]);
    } catch (error) {
      this.logger.error(`Failed to mark job run start: ${error.message}`);
      throw new InternalServerErrorException(`Failed to mark job run start: ${error.message}`);
    }
  }

  /**
   * Mark job run as finished
   */
  async markJobRunFinish(
    runId: number,
    status: 'success' | 'failed',
    errorMessage?: string,
    durationMs?: number
  ): Promise<void> {
    const pool = await this.ensureControlPool();

    try {
      await pool
        .request()
        .input('id', sql.BigInt, runId)
        .input('finished_at', sql.DateTime2, new Date())
        .input('status', sql.NVarChar(20), status)
        .input('error_message', sql.NVarChar(sql.MAX), errorMessage || null)
        .input('run_duration_ms', sql.Int, durationMs || null)
        .query(`
          UPDATE job_runs
          SET finished_at = @finished_at,
              status = @status,
              error_message = @error_message,
              run_duration_ms = @run_duration_ms
          WHERE id = @id
        `);
    } catch (error) {
      this.logger.error(`Failed to mark job run finish: ${error.message}`);
      throw new InternalServerErrorException(`Failed to mark job run finish: ${error.message}`);
    }
  }

  /**
   * Update job's next run time and status
   */
  async updateNextRun(
    jobId: number,
    nextRunAt: Date,
    status: string,
    error?: string
  ): Promise<void> {
    const pool = await this.ensureControlPool();

    try {
      await pool
        .request()
        .input('id', sql.BigInt, jobId)
        .input('next_run_at', sql.DateTime2, nextRunAt)
        .input('last_run_at', sql.DateTime2, new Date())
        .input('last_status', sql.NVarChar(20), status)
        .input('last_error', sql.NVarChar(sql.MAX), error || null)
        .input('updated_at', sql.DateTime2, new Date())
        .query(`
          UPDATE scheduled_jobs
          SET next_run_at = @next_run_at,
              last_run_at = @last_run_at,
              last_status = @last_status,
              last_error = @last_error,
              updated_at = @updated_at
          WHERE id = @id
        `);
    } catch (error) {
      this.logger.error(`Failed to update next run: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update next run: ${error.message}`);
    }
  }

  /**
   * Get job run history
   */
  async getJobRuns(jobId: number, limit: number = 50): Promise<JobRun[]> {
    const pool = await this.ensureControlPool();

    try {
      const result = await pool
        .request()
        .input('job_id', sql.BigInt, jobId)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT TOP (@limit) *
          FROM job_runs
          WHERE job_id = @job_id
          ORDER BY started_at DESC
        `);

      return result.recordset.map(row => this.mapToJobRun(row));
    } catch (error) {
      this.logger.error(`Failed to get job runs: ${error.message}`);
      throw new InternalServerErrorException(`Failed to get job runs: ${error.message}`);
    }
  }

  /**
   * Get tenant ID from tenant code (helper for controllers)
   */
  async getTenantIdFromCode(tenantCode: string): Promise<string> {
    const pool = await this.ensureControlPool();

    try {
      const result = await pool
        .request()
        .input('code', sql.NVarChar, tenantCode)
        .query('SELECT id FROM tenants WHERE code = @code AND is_active = 1');

      if (result.recordset.length === 0) {
        throw new InternalServerErrorException(`Tenant not found: ${tenantCode}`);
      }

      return result.recordset[0].id;
    } catch (error) {
      this.logger.error(`Failed to get tenant ID: ${error.message}`);
      throw error;
    }
  }
}

