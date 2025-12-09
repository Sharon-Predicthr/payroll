import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { Request } from 'express';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /api/notifications
   * Get user notifications
   */
  @Get()
  async getUserNotifications(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const user = req.user;
    if (!user) {
      throw new Error('User not found in request');
    }

    const userId = user.sub;
    const tenantId = await this.notificationsService.getTenantIdFromCode(user.tenantCode);

    // Debug logging
    this.logger.log(`[GetNotifications] Querying for userId: ${userId} (type: ${typeof userId}), tenantId: ${tenantId} (type: ${typeof tenantId}), tenantCode: ${user.tenantCode}`);
    this.logger.log(`[GetNotifications] JWT payload - sub: ${user.sub}, email: ${user.email}, tenantCode: ${user.tenantCode}`);

    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const result = await this.notificationsService.getUserNotifications(
      userId,
      tenantId,
      limitNum,
      offsetNum,
    );

    this.logger.log(`[GetNotifications] Found ${result.notifications.length} notifications out of ${result.total} total`);
    
    // Debug: Log first few notification user IDs to compare
    if (result.notifications.length > 0) {
      this.logger.log(`[GetNotifications] Sample notification user IDs: ${result.notifications.slice(0, 3).map(n => n.user_id).join(', ')}`);
    }

    return {
      success: true,
      data: result.notifications,
      pagination: {
        total: result.total,
        limit: limitNum,
        offset: offsetNum,
      },
    };
  }

  /**
   * POST /api/notifications/read
   * Mark notification(s) as read
   */
  @Post('read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Req() req: Request, @Body() body: { notificationId?: number; markAll?: boolean }) {
    const user = req.user;
    if (!user) {
      throw new Error('User not found in request');
    }

    const userId = user.sub;
    const tenantId = await this.notificationsService.getTenantIdFromCode(user.tenantCode);

    if (body.markAll) {
      const count = await this.notificationsService.markAllAsRead(userId, tenantId);
      return {
        success: true,
        message: `Marked ${count} notifications as read`,
        count,
      };
    } else if (body.notificationId) {
      const success = await this.notificationsService.markAsRead(
        body.notificationId,
        userId,
        tenantId,
      );
      return {
        success,
        message: success ? 'Notification marked as read' : 'Notification not found',
      };
    } else {
      return {
        success: false,
        message: 'Either notificationId or markAll must be provided',
      };
    }
  }

  /**
   * GET /api/notifications/unread-count
   * Get unread notification count
   */
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    const user = req.user;
    if (!user) {
      throw new Error('User not found in request');
    }

    const userId = user.sub;
    const tenantId = await this.notificationsService.getTenantIdFromCode(user.tenantCode);

    const count = await this.notificationsService.getUnreadCount(userId, tenantId);

    return {
      success: true,
      count,
    };
  }

  /**
   * POST /api/notifications/seed
   * Create sample notifications for testing (DEV ONLY - remove in production)
   */
  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seedNotifications(@Req() req: Request) {
    const user = req.user;
    if (!user) {
      throw new Error('User not found in request');
    }

    const userId = user.sub;
    const tenantCode = user.tenantCode;

    const sampleNotifications = [
      {
        type: 'payroll',
        title: 'Payroll Run Completed',
        message: 'December 2024 payroll has been processed successfully for 45 employees. Total amount: $125,000',
        is_read: false,
        metadata: { payrollId: 'PR-2024-12', amount: 125000, employeeCount: 45 },
      },
      {
        type: 'payroll',
        title: 'Payroll Approval Required',
        message: 'The payroll for January 2025 is ready for your review and approval.',
        is_read: false,
        metadata: { payrollId: 'PR-2025-01', status: 'pending_approval' },
      },
      {
        type: 'employees',
        title: 'New Employee Added',
        message: 'John Smith has been added to the system as a Full-Time Employee in the Engineering department.',
        is_read: true,
        metadata: { employeeId: 'EMP-001', department: 'Engineering' },
      },
      {
        type: 'employees',
        title: 'Employee Contract Expiring',
        message: 'Sarah Johnson\'s contract will expire in 30 days. Please review and renew if needed.',
        is_read: false,
        metadata: { employeeId: 'EMP-002', expiryDate: '2025-02-15' },
      },
      {
        type: 'documents',
        title: 'Payslip Generated',
        message: 'Payslip for employee ID EMP-003 has been generated and is ready for download.',
        is_read: false,
        metadata: { employeeId: 'EMP-003', payslipId: 'PS-2024-12-003' },
      },
      {
        type: 'documents',
        title: 'Tax Report Available',
        message: 'Q4 2024 tax report has been generated and is available in the Reports section.',
        is_read: true,
        metadata: { reportId: 'TAX-Q4-2024', period: 'Q4 2024' },
      },
      {
        type: 'system',
        title: 'System Backup Completed',
        message: 'Daily backup completed successfully at 2:00 AM. All data has been secured.',
        is_read: false,
        metadata: { backupId: 'BK-2024-12-15', timestamp: '2024-12-15T02:00:00Z' },
      },
      {
        type: 'system',
        title: 'Database Maintenance Scheduled',
        message: 'Scheduled database maintenance will occur on December 20, 2024 at 3:00 AM. Expected downtime: 30 minutes.',
        is_read: false,
        metadata: { scheduledDate: '2024-12-20', downtime: '30 minutes' },
      },
      {
        type: 'integrations',
        title: 'Integration Sync Successful',
        message: 'Successfully synced employee data with HR system. 3 new records imported.',
        is_read: true,
        metadata: { integrationId: 'HR-SYNC-001', recordsImported: 3 },
      },
      {
        type: 'integrations',
        title: 'Integration Error',
        message: 'Failed to sync with accounting system. Please check the integration settings.',
        is_read: false,
        metadata: { integrationId: 'ACC-SYNC-001', error: 'Connection timeout' },
      },
      {
        type: 'payroll',
        title: 'Payroll Calculation Warning',
        message: 'Warning: 2 employees have missing time entries for the current pay period.',
        is_read: false,
        metadata: { payrollId: 'PR-2024-12', warningCount: 2 },
      },
      {
        type: 'employees',
        title: 'Leave Request Submitted',
        message: 'Michael Brown has submitted a leave request for December 25-27, 2024.',
        is_read: false,
        metadata: { employeeId: 'EMP-004', leaveType: 'Annual', days: 3 },
      },
      {
        type: 'system',
        title: 'Security Alert',
        message: 'Multiple failed login attempts detected from IP address 192.168.1.100. Account has been temporarily locked.',
        is_read: false,
        metadata: { ipAddress: '192.168.1.100', action: 'account_locked' },
      },
      {
        type: 'documents',
        title: 'Annual Report Ready',
        message: 'Annual payroll report for 2024 has been generated and is ready for review.',
        is_read: true,
        metadata: { reportId: 'ANNUAL-2024', year: 2024 },
      },
      {
        type: 'integrations',
        title: 'New Integration Available',
        message: 'A new integration with QuickBooks is now available. Click to configure.',
        is_read: false,
        metadata: { integrationName: 'QuickBooks', status: 'available' },
      },
    ];

    const createdNotifications = [];
    const tenantId = await this.notificationsService.getTenantIdFromCode(tenantCode);

    // Debug logging
    console.log(`[Seed] Creating notifications for userId: ${userId}, tenantId: ${tenantId}, tenantCode: ${tenantCode}`);

    // Create notifications with varying timestamps
    const now = new Date();
    for (let i = 0; i < sampleNotifications.length; i++) {
      const sample = sampleNotifications[i];

      try {
        const notification = await this.notificationsService.createNotification(
          tenantId,
          userId,
          sample.type,
          sample.title,
          sample.message,
          sample.metadata,
        );

        // If notification should be read, mark it as read
        if (sample.is_read && notification.id) {
          await this.notificationsService.markAsRead(notification.id, userId, tenantId);
        }

        createdNotifications.push(notification);
      } catch (error) {
        console.error(`Failed to create notification ${i + 1}:`, error);
      }
    }

    return {
      success: true,
      message: `Created ${createdNotifications.length} sample notifications`,
      count: createdNotifications.length,
      notifications: createdNotifications,
    };
  }
}

