import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import * as parser from 'cron-parser';
import { ScheduledJob, RecurrenceType } from './interfaces/scheduled-job.interface';

@Injectable()
export class JobsRecurrenceService {
  private readonly logger = new Logger(JobsRecurrenceService.name);

  /**
   * Calculate the next run time for a job based on its recurrence settings
   */
  calculateNextRunAt(job: ScheduledJob, fromDate?: Date): Date {
    const from = fromDate || new Date();
    const timezone = job.timezone || 'UTC';

    try {
      switch (job.recurrence_type) {
        case 'cron':
          return this.calculateCronNextRun(job, from, timezone);

        case 'monthly':
          return this.calculateMonthlyNextRun(job, from, timezone);

        case 'weekly':
          return this.calculateWeeklyNextRun(job, from, timezone);

        case 'biweekly':
          return this.calculateBiweeklyNextRun(job, from, timezone);

        case 'custom':
          // TODO: Implement custom recurrence logic
          this.logger.warn(`Custom recurrence type not yet implemented for job ${job.id}`);
          // Fallback: return 1 month from now
          return DateTime.fromJSDate(from).setZone(timezone).plus({ months: 1 }).toJSDate();

        default:
          this.logger.error(`Unknown recurrence type: ${job.recurrence_type} for job ${job.id}`);
          // Fallback: return 1 month from now
          return DateTime.fromJSDate(from).setZone(timezone).plus({ months: 1 }).toJSDate();
      }
    } catch (error) {
      this.logger.error(`Error calculating next run for job ${job.id}: ${error.message}`);
      // Fallback: return 1 month from now
      return DateTime.fromJSDate(from).setZone(timezone).plus({ months: 1 }).toJSDate();
    }
  }

  /**
   * Calculate next run for cron-based recurrence
   */
  private calculateCronNextRun(job: ScheduledJob, from: Date, timezone: string): Date {
    if (!job.cron_expression) {
      throw new InternalServerErrorException(
        `Cron expression is required for cron recurrence type (job ${job.id})`
      );
    }

    try {
      // Parse cron expression with timezone
      const interval = parser.parseExpression(job.cron_expression, {
        tz: timezone,
        currentDate: from,
      });

      const nextRun = interval.next();
      return nextRun.toDate();
    } catch (error) {
      this.logger.error(`Invalid cron expression "${job.cron_expression}" for job ${job.id}: ${error.message}`);
      throw new InternalServerErrorException(`Invalid cron expression: ${error.message}`);
    }
  }

  /**
   * Calculate next run for monthly recurrence
   * Runs on a specific day of the month (e.g., 1st, 15th)
   */
  private calculateMonthlyNextRun(job: ScheduledJob, from: Date, timezone: string): Date {
    if (job.day_of_month === null || job.day_of_month === undefined) {
      throw new InternalServerErrorException(
        `day_of_month is required for monthly recurrence type (job ${job.id})`
      );
    }

    const dayOfMonth = job.day_of_month;
    const monthInterval = job.month_interval || 1;

    // Convert from date to timezone-aware DateTime
    let dt = DateTime.fromJSDate(from).setZone(timezone);

    // Set to the specified day of month
    // If the day doesn't exist in the current month (e.g., Feb 30), use last day of month
    const lastDayOfMonth = dt.endOf('month').day;
    const targetDay = Math.min(dayOfMonth, lastDayOfMonth);

    // If we're past the target day this month, move to next month
    if (dt.day > targetDay) {
      dt = dt.plus({ months: monthInterval });
    }

    // Set to target day
    dt = dt.set({ day: targetDay, hour: 0, minute: 0, second: 0, millisecond: 0 });

    // If the calculated date is in the past or is today, move to next interval
    if (dt.toMillis() <= DateTime.fromJSDate(from).setZone(timezone).toMillis()) {
      dt = dt.plus({ months: monthInterval });
      // Recalculate day in case month changed (e.g., Jan 31 -> Feb 28/29)
      const lastDayOfNewMonth = dt.endOf('month').day;
      const newTargetDay = Math.min(dayOfMonth, lastDayOfNewMonth);
      dt = dt.set({ day: newTargetDay });
    }

    return dt.toJSDate();
  }

  /**
   * Calculate next run for weekly recurrence
   * Runs on a specific weekday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
   */
  private calculateWeeklyNextRun(job: ScheduledJob, from: Date, timezone: string): Date {
    if (job.weekday === null || job.weekday === undefined) {
      throw new InternalServerErrorException(
        `weekday is required for weekly recurrence type (job ${job.id})`
      );
    }

    const targetWeekday = job.weekday; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Convert from date to timezone-aware DateTime
    let dt = DateTime.fromJSDate(from).setZone(timezone);

    // Get current weekday (Luxon: 7 = Sunday, 1 = Monday, ..., 6 = Saturday)
    // Convert to our format: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentWeekday = dt.weekday === 7 ? 0 : dt.weekday;

    // Calculate days until target weekday
    let daysUntilTarget = targetWeekday - currentWeekday;
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7; // Move to next week
    }

    // Set to target weekday at midnight
    dt = dt.plus({ days: daysUntilTarget }).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });

    // If the calculated date is today and we're past midnight, it's already today, so move to next week
    if (daysUntilTarget === 0 && dt.toMillis() <= DateTime.fromJSDate(from).setZone(timezone).toMillis()) {
      dt = dt.plus({ days: 7 });
    }

    return dt.toJSDate();
  }

  /**
   * Calculate next run for biweekly recurrence
   * Runs every X weeks from the last run (or from a reference date)
   */
  private calculateBiweeklyNextRun(job: ScheduledJob, from: Date, timezone: string): Date {
    if (job.week_interval === null || job.week_interval === undefined) {
      throw new InternalServerErrorException(
        `week_interval is required for biweekly recurrence type (job ${job.id})`
      );
    }

    const weekInterval = job.week_interval;

    // Use last_run_at if available, otherwise use from date
    const referenceDate = job.last_run_at || from;

    // Convert to timezone-aware DateTime
    let dt = DateTime.fromJSDate(referenceDate).setZone(timezone);

    // Add week interval
    dt = dt.plus({ weeks: weekInterval });

    // If the calculated date is in the past, add another interval
    if (dt.toMillis() <= DateTime.fromJSDate(from).setZone(timezone).toMillis()) {
      dt = dt.plus({ weeks: weekInterval });
    }

    return dt.toJSDate();
  }

  /**
   * Validate recurrence configuration
   */
  validateRecurrenceConfig(job: Partial<ScheduledJob>): void {
    const recurrenceType = job.recurrence_type;

    if (!recurrenceType) {
      throw new InternalServerErrorException('recurrence_type is required');
    }

    switch (recurrenceType) {
      case 'cron':
        if (!job.cron_expression) {
          throw new InternalServerErrorException('cron_expression is required for cron recurrence type');
        }
        // Validate cron expression
        try {
          parser.parseExpression(job.cron_expression);
        } catch (error) {
          throw new InternalServerErrorException(`Invalid cron expression: ${error.message}`);
        }
        break;

      case 'monthly':
        if (job.day_of_month === null || job.day_of_month === undefined) {
          throw new InternalServerErrorException('day_of_month is required for monthly recurrence type');
        }
        if (job.day_of_month < 1 || job.day_of_month > 31) {
          throw new InternalServerErrorException('day_of_month must be between 1 and 31');
        }
        break;

      case 'weekly':
        if (job.weekday === null || job.weekday === undefined) {
          throw new InternalServerErrorException('weekday is required for weekly recurrence type');
        }
        if (job.weekday < 0 || job.weekday > 6) {
          throw new InternalServerErrorException('weekday must be between 0 (Sunday) and 6 (Saturday)');
        }
        break;

      case 'biweekly':
        if (job.week_interval === null || job.week_interval === undefined) {
          throw new InternalServerErrorException('week_interval is required for biweekly recurrence type');
        }
        if (job.week_interval < 1) {
          throw new InternalServerErrorException('week_interval must be at least 1');
        }
        break;

      case 'custom':
        // Custom validation can be added later
        break;

      default:
        throw new InternalServerErrorException(`Unknown recurrence type: ${recurrenceType}`);
    }
  }
}

