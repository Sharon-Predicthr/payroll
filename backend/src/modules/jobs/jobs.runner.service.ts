import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { JobsService } from './jobs.service';
import { JobsRecurrenceService } from './jobs-recurrence.service';
import { ScheduledJob } from './interfaces/scheduled-job.interface';
import { TenantResolverService } from '../auth/tenant-resolver.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as sql from 'mssql';

@Injectable()
export class JobsRunnerService {
  private readonly logger = new Logger(JobsRunnerService.name);
  private isRunning = false;

  constructor(
    private jobsService: JobsService,
    private recurrenceService: JobsRecurrenceService,
    private tenantResolverService: TenantResolverService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Run every 60 seconds to check for due jobs
   */
  @Interval(60000)
  async handleJobScan() {
    // Prevent concurrent executions
    if (this.isRunning) {
      this.logger.warn('Previous job scan still running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    const now = new Date();

    try {
      // Get all jobs that are due to run
      const dueJobs = await this.jobsService.getDueJobs(now);
      
      if (dueJobs.length === 0) {
        this.logger.debug('No jobs due to run');
        return;
      }

      this.logger.log(`Found ${dueJobs.length} job(s) due to run`);

      // Execute each job
      for (const job of dueJobs) {
        await this.executeJob(job);
      }
    } catch (error) {
      this.logger.error(`Error in job scan: ${error.message}`, error.stack);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute a single job
   */
  private async executeJob(job: ScheduledJob): Promise<void> {
    const startTime = Date.now();
    let jobRun;

    try {
      this.logger.log(`Executing job ${job.id} (${job.name}) - Type: ${job.job_type}`);

      // Mark job run as started
      jobRun = await this.jobsService.markJobRunStart(job, new Date());

      // Dispatch to appropriate handler based on job type
      await this.dispatchJob(job);

      // Mark job run as successful
      const durationMs = Date.now() - startTime;
      await this.jobsService.markJobRunFinish(jobRun.id, 'success', undefined, durationMs);

      // Calculate next run time based on recurrence settings
      const now = new Date();
      const nextRunAt = this.recurrenceService.calculateNextRunAt(job, now);
      
      // Update job's next run time and status
      await this.jobsService.updateNextRun(job.id, nextRunAt, 'success');

      this.logger.log(`Job ${job.id} completed successfully in ${durationMs}ms`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';

      this.logger.error(`Job ${job.id} failed: ${errorMessage}`, error.stack);

      // Mark job run as failed
      if (jobRun) {
        await this.jobsService.markJobRunFinish(jobRun.id, 'failed', errorMessage, durationMs);
      }

      // Calculate next run time based on recurrence settings (even on failure)
      const now = new Date();
      const nextRunAt = this.recurrenceService.calculateNextRunAt(job, now);
      
      // Update job's next run time and error status
      await this.jobsService.updateNextRun(job.id, nextRunAt, 'failed', errorMessage);
    }
  }

  /**
   * Dispatch job to appropriate handler
   */
  private async dispatchJob(job: ScheduledJob): Promise<void> {
    switch (job.job_type) {
      case 'PAYROLL_DUE_REMINDER':
        await this.handlePayrollDueReminder(job);
        break;
      case 'DOCUMENT_EXPIRY_CHECK':
        await this.handleDocumentExpiryCheck(job);
        break;
      case 'INTEGRATION_STATUS_CHECK':
        await this.handleIntegrationStatusCheck(job);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.job_type}`);
        break;
    }
  }

  /**
   * Handle payroll due reminder job
   */
  private async handlePayrollDueReminder(job: ScheduledJob): Promise<void> {
    const config = job.payload_json || {};
    const daysBeforeDue = config.daysBeforeDue || 3;

    if (!job.tenant_id) {
      this.logger.warn('PAYROLL_DUE_REMINDER job requires tenant_id');
      return;
    }

    try {
      this.logger.log(`[PAYROLL_DUE_REMINDER] Processing job ${job.id} for tenant ${job.tenant_id}`);

      // Get tenant database connection
      const tenantPool = await this.tenantResolverService.getTenantPoolById(job.tenant_id);

      // Query for upcoming payroll periods
      // Try to query actual payroll table, but if it doesn't exist, create a test notification
      const payrollQuery = `
        SELECT 
          payroll_period,
          payment_date,
          COUNT(*) as employee_count,
          SUM(total_amount) as total_amount
        FROM payroll_runs
        WHERE payment_date BETWEEN GETDATE() AND DATEADD(day, @daysBeforeDue, GETDATE())
          AND status = 'pending'
        GROUP BY payroll_period, payment_date
      `;

      let payrollResults;
      let hasPayrollData = false;
      
      try {
        const result = await tenantPool
          .request()
          .input('daysBeforeDue', sql.Int, daysBeforeDue)
          .query(payrollQuery);
        payrollResults = result.recordset;
        hasPayrollData = payrollResults.length > 0;
        this.logger.log(`[PAYROLL_DUE_REMINDER] Found ${payrollResults.length} upcoming payroll period(s)`);
      } catch (error) {
        // If table doesn't exist, create a test notification anyway
        this.logger.debug(`[PAYROLL_DUE_REMINDER] Payroll table query failed (table may not exist): ${error.message}`);
        this.logger.log(`[PAYROLL_DUE_REMINDER] Creating test notification for job testing`);
        payrollResults = [];
        hasPayrollData = false;
      }

      const tenantId = job.tenant_id;
      const adminUsers = await this.getTenantAdminUsers(tenantId);

      if (adminUsers.length === 0) {
        this.logger.warn(`[PAYROLL_DUE_REMINDER] No users found for tenant ${tenantId}. Cannot create notifications.`);
        this.logger.warn(`[PAYROLL_DUE_REMINDER] This might mean the logged-in user is not in tenant_user_links table.`);
        return;
      }

      // If we have actual payroll data, create notifications for each payroll period
      if (hasPayrollData && payrollResults.length > 0) {
        for (const payroll of payrollResults) {
          for (const userId of adminUsers) {
            await this.notificationsService.createNotification(
              tenantId,
              userId,
              'payroll',
              'Payroll Due Reminder',
              `Payroll period ${payroll.payroll_period} is due in ${daysBeforeDue} days. Payment date: ${payroll.payment_date}. Total amount: $${payroll.total_amount?.toLocaleString() || 'N/A'}`,
              {
                payrollPeriod: payroll.payroll_period,
                paymentDate: payroll.payment_date,
                employeeCount: payroll.employee_count,
                totalAmount: payroll.total_amount,
                daysBeforeDue: daysBeforeDue,
              }
            );
            this.logger.log(`[PAYROLL_DUE_REMINDER] Created notification for user ${userId} about payroll period ${payroll.payroll_period}`);
          }
        }
      } else {
        // Create a test notification to verify the job system is working
        // This helps with testing when payroll tables don't exist yet
        const testMessage = `Test notification from job scheduler. Job "${job.name}" executed successfully at ${new Date().toISOString()}. This is a test notification to verify the job scheduler is working.`;
        
        for (const userId of adminUsers) {
          await this.notificationsService.createNotification(
            tenantId,
            userId,
            'payroll',
            'Payroll Due Reminder (Test)',
            testMessage,
            {
              jobId: job.id,
              jobName: job.name,
              jobType: job.job_type,
              isTest: true,
              executedAt: new Date().toISOString(),
            }
          );
          this.logger.log(`[PAYROLL_DUE_REMINDER] Created TEST notification for user ${userId} to verify job scheduler`);
        }
      }
    } catch (error) {
      this.logger.error(`[PAYROLL_DUE_REMINDER] Error in handlePayrollDueReminder: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle document expiry check job
   */
  private async handleDocumentExpiryCheck(job: ScheduledJob): Promise<void> {
    const config = job.payload_json || {};
    const daysBeforeExpiry = config.daysBeforeExpiry || 30;

    if (!job.tenant_id) {
      this.logger.warn('DOCUMENT_EXPIRY_CHECK job requires tenant_id');
      return;
    }

    try {
      const tenantPool = await this.tenantResolverService.getTenantPoolById(job.tenant_id);

      // Query for expiring documents
      // TODO: Replace with actual employee_documents table query when available
      const documentsQuery = `
        SELECT 
          ed.id,
          ed.employee_id,
          e.first_name,
          e.last_name,
          ed.document_type,
          ed.expiry_date,
          DATEDIFF(day, GETDATE(), ed.expiry_date) as days_until_expiry
        FROM employee_documents ed
        INNER JOIN employees e ON ed.employee_id = e.employee_id
        WHERE ed.expiry_date BETWEEN GETDATE() AND DATEADD(day, @daysBeforeExpiry, GETDATE())
          AND ed.is_active = 1
        ORDER BY ed.expiry_date ASC
      `;

      let expiringDocuments;
      try {
        const result = await tenantPool
          .request()
          .input('daysBeforeExpiry', sql.Int, daysBeforeExpiry)
          .query(documentsQuery);
        expiringDocuments = result.recordset;
      } catch (error) {
        // If table doesn't exist, use stub data
        this.logger.debug('Employee documents table query failed (table may not exist), using stub logic');
        expiringDocuments = [];
      }

      // Create notifications for expiring documents
      if (expiringDocuments.length > 0) {
        const tenantId = job.tenant_id;
        const adminUsers = await this.getTenantAdminUsers(tenantId);

        for (const doc of expiringDocuments) {
          for (const userId of adminUsers) {
            await this.notificationsService.createNotification(
              tenantId,
              userId,
              'documents',
              'Document Expiring Soon',
              `${doc.first_name} ${doc.last_name}'s ${doc.document_type} document will expire in ${doc.days_until_expiry} days (${doc.expiry_date}).`,
              {
                documentId: doc.id,
                employeeId: doc.employee_id,
                documentType: doc.document_type,
                expiryDate: doc.expiry_date,
                daysUntilExpiry: doc.days_until_expiry,
              }
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error in handleDocumentExpiryCheck: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle integration status check job
   */
  private async handleIntegrationStatusCheck(job: ScheduledJob): Promise<void> {
    try {
      // This can check either Control DB or Tenant DB integrations
      // For now, we'll check Control DB for integration status
      // Note: We'll use JobsService's control pool access pattern instead
      // TODO: Add ensureControlPool method to TenantResolverService or use a different approach

      // TODO: Replace with actual integrations_status table query when available
      const integrationsQuery = `
        SELECT 
          id,
          name,
          status,
          last_sync_at,
          error_message
        FROM integrations_status
        WHERE status = 'failed'
          AND last_sync_at < DATEADD(minute, -30, GETDATE())
      `;

      // TODO: Implement integration status check when integrations table is available
      // For now, we'll skip this check
      const failedIntegrations: any[] = [];
      this.logger.debug('Integration status check skipped (table not yet implemented)');

      // Create system notifications for failed integrations
      if (failedIntegrations.length > 0 && job.tenant_id) {
        const tenantId = job.tenant_id;
        const adminUsers = await this.getTenantAdminUsers(tenantId);

        for (const integration of failedIntegrations) {
          for (const userId of adminUsers) {
            await this.notificationsService.createNotification(
              tenantId,
              userId,
              'integrations',
              'Integration Error',
              `Integration "${integration.name}" has failed. Last sync: ${integration.last_sync_at}. Error: ${integration.error_message || 'Unknown error'}`,
              {
                integrationId: integration.id,
                integrationName: integration.name,
                status: integration.status,
                lastSyncAt: integration.last_sync_at,
                errorMessage: integration.error_message,
              }
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error in handleIntegrationStatusCheck: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get admin users for a tenant
   * Uses tenant_user_links table to find users with admin role
   */
  private async getTenantAdminUsers(tenantId: string): Promise<string[]> {
    try {
      const controlPool = await this.jobsService.ensureControlPool();
      
      // First, try to get users with admin role from tenant_user_links
      let result = await controlPool
        .request()
        .input('tenantId', sql.UniqueIdentifier, tenantId)
        .query(`
          SELECT DISTINCT u.id
          FROM app_users u
          INNER JOIN tenant_user_links l ON l.user_id = u.id
          WHERE l.tenant_id = @tenantId
            AND u.is_active = 1
            AND (l.role = 'admin' OR l.role = 'super_admin' OR l.role IS NULL)
        `);

      let userIds = result.recordset.map((row: any) => row.id);
      
      // If no admin users found, get all active users for the tenant (for testing)
      if (userIds.length === 0) {
        this.logger.debug(`No admin users found, getting all active users for tenant ${tenantId}`);
        result = await controlPool
          .request()
          .input('tenantId', sql.UniqueIdentifier, tenantId)
          .query(`
            SELECT DISTINCT u.id
            FROM app_users u
            INNER JOIN tenant_user_links l ON l.user_id = u.id
            WHERE l.tenant_id = @tenantId
              AND u.is_active = 1
          `);
        
        userIds = result.recordset.map((row: any) => row.id);
      }
      
      if (userIds.length === 0) {
        this.logger.warn(`No users found for tenant ${tenantId}`);
      } else {
        this.logger.log(`Found ${userIds.length} user(s) for tenant ${tenantId} to receive notifications`);
      this.logger.log(`[DEBUG] User IDs that will receive notifications: ${userIds.join(', ')}`);
      }
      
      return userIds;
    } catch (error) {
      this.logger.error(`Failed to get users for tenant ${tenantId}: ${error.message}`, error.stack);
      // Fallback: return empty array
      return [];
    }
  }
}

