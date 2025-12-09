import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as sql from 'mssql';

export interface Notification {
  id: number;
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
  is_read: boolean;
  created_at: Date;
}

export interface CreateNotificationDto {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private controlPool: sql.ConnectionPool;

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
        case 'trustservercertificate':
          config.options.trustServerCertificate = value.toLowerCase() === 'true';
          break;
      }
    }
    
    return config;
  }

  /**
   * Get or create control database connection pool
   */
  private async ensureControlPool(): Promise<sql.ConnectionPool> {
    if (this.controlPool && this.controlPool.connected) {
      return this.controlPool;
    }

    if (!process.env.CONTROL_DB_URL) {
      throw new InternalServerErrorException(
        'Database not configured. Please set CONTROL_DB_URL environment variable.'
      );
    }

    try {
      const config = this.parseConnectionString(process.env.CONTROL_DB_URL);
      this.controlPool = new sql.ConnectionPool(config);
      await this.controlPool.connect();
      this.logger.log('Control database connection established for notifications');
      return this.controlPool;
    } catch (error) {
      this.controlPool = null;
      this.logger.error(`Failed to connect to control database: ${error.message}`);
      throw new InternalServerErrorException(
        `Failed to connect to control database: ${error.message}`
      );
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(
    tenantId: string,
    userId: string,
    type: string,
    title: string,
    message: string,
    metadata?: any
  ): Promise<Notification> {
    const pool = await this.ensureControlPool();

    try {
      const metadataJson = metadata ? JSON.stringify(metadata) : null;

      // Debug: Log the UUIDs being used
      this.logger.log(`[CreateNotification] tenantId: ${tenantId} (type: ${typeof tenantId}), userId: ${userId} (type: ${typeof userId})`);

      const result = await pool
        .request()
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .input('user_id', sql.UniqueIdentifier, userId)
        .input('type', sql.NVarChar(50), type)
        .input('title', sql.NVarChar(200), title)
        .input('message', sql.NVarChar(sql.MAX), message)
        .input('metadata', sql.NVarChar(sql.MAX), metadataJson)
        .query(`
          INSERT INTO notifications (tenant_id, user_id, type, title, message, metadata, is_read)
          OUTPUT INSERTED.*
          VALUES (@tenant_id, @user_id, @type, @title, @message, @metadata, 0)
        `);

      const notification = result.recordset[0];
      this.logger.log(`Notification created: ${notification.id} for user ${userId}, tenant ${tenantId}`);
      
      return this.mapToNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      this.logger.error(`Failed to create notification - tenantId: ${tenantId}, userId: ${userId}`);
      throw new InternalServerErrorException(`Failed to create notification: ${error.message}`);
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ notifications: Notification[]; total: number }> {
    const pool = await this.ensureControlPool();

    try {
      // Debugging: Check all notifications in DB for this tenant to see what user_ids exist
      const allNotificationsDebug = await pool
        .request()
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query(`
          SELECT TOP 10 id, user_id, tenant_id, title, created_at
          FROM notifications
          WHERE tenant_id = @tenant_id
          ORDER BY created_at DESC
        `);
      this.logger.log(`[GetUserNotifications] DEBUG - Last 10 notifications in DB for tenant ${tenantId}:`, JSON.stringify(allNotificationsDebug.recordset, null, 2));
      
      // Debugging: Check notifications for this specific user
      const userNotificationsDebug = await pool
        .request()
        .input('user_id', sql.UniqueIdentifier, userId)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query(`
          SELECT TOP 5 id, user_id, tenant_id, title, created_at
          FROM notifications
          WHERE user_id = @user_id AND tenant_id = @tenant_id
          ORDER BY created_at DESC
        `);
      this.logger.log(`[GetUserNotifications] DEBUG - Last 5 notifications for userId ${userId} and tenantId ${tenantId}:`, JSON.stringify(userNotificationsDebug.recordset, null, 2));

      // Get total count
      const countResult = await pool
        .request()
        .input('user_id', sql.UniqueIdentifier, userId)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query(`
          SELECT COUNT(*) as total
          FROM notifications
          WHERE user_id = @user_id AND tenant_id = @tenant_id
        `);

      const total = countResult.recordset[0].total;
      this.logger.log(`[GetUserNotifications] Count query returned total: ${total}`);

      // Debug: Log the UUIDs being queried
      this.logger.log(`[GetUserNotifications] Querying with tenantId: ${tenantId} (type: ${typeof tenantId}), userId: ${userId} (type: ${typeof userId})`);

      // Get notifications
      const result = await pool
        .request()
        .input('user_id', sql.UniqueIdentifier, userId)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .input('limit', sql.Int, limit)
        .input('offset', sql.Int, offset)
        .query(`
          SELECT *
          FROM notifications
          WHERE user_id = @user_id AND tenant_id = @tenant_id
          ORDER BY created_at DESC
          OFFSET @offset ROWS
          FETCH NEXT @limit ROWS ONLY
        `);

      this.logger.log(`[GetUserNotifications] Raw query returned ${result.recordset.length} rows`);

      const notifications = result.recordset.map(row => this.mapToNotification(row));

      return { notifications, total };
    } catch (error) {
      this.logger.error(`Failed to get user notifications: ${error.message}`);
      throw new InternalServerErrorException(`Failed to get notifications: ${error.message}`);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number, userId: string, tenantId: string): Promise<boolean> {
    const pool = await this.ensureControlPool();

    try {
      const result = await pool
        .request()
        .input('id', sql.BigInt, notificationId)
        .input('user_id', sql.UniqueIdentifier, userId)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query(`
          UPDATE notifications
          SET is_read = 1
          WHERE id = @id AND user_id = @user_id AND tenant_id = @tenant_id
        `);

      const rowsAffected = result.rowsAffected[0];
      if (rowsAffected > 0) {
        this.logger.log(`Notification ${notificationId} marked as read`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to mark notification as read: ${error.message}`);
      throw new InternalServerErrorException(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, tenantId: string): Promise<number> {
    const pool = await this.ensureControlPool();

    try {
      const result = await pool
        .request()
        .input('user_id', sql.UniqueIdentifier, userId)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query(`
          UPDATE notifications
          SET is_read = 1
          WHERE user_id = @user_id AND tenant_id = @tenant_id AND is_read = 0
        `);

      const rowsAffected = result.rowsAffected[0];
      this.logger.log(`Marked ${rowsAffected} notifications as read for user ${userId}`);
      return rowsAffected;
    } catch (error) {
      this.logger.error(`Failed to mark all notifications as read: ${error.message}`);
      throw new InternalServerErrorException(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  /**
   * Delete old notifications (older than specified days)
   */
  async deleteOldNotifications(daysOld: number = 90): Promise<number> {
    const pool = await this.ensureControlPool();

    try {
      const result = await pool
        .request()
        .input('daysOld', sql.Int, daysOld)
        .query(`
          DELETE FROM notifications
          WHERE created_at < DATEADD(DAY, -@daysOld, SYSDATETIME())
        `);

      const rowsAffected = result.rowsAffected[0];
      this.logger.log(`Deleted ${rowsAffected} old notifications (older than ${daysOld} days)`);
      return rowsAffected;
    } catch (error) {
      this.logger.error(`Failed to delete old notifications: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete old notifications: ${error.message}`);
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    const pool = await this.ensureControlPool();

    try {
      const result = await pool
        .request()
        .input('user_id', sql.UniqueIdentifier, userId)
        .input('tenant_id', sql.UniqueIdentifier, tenantId)
        .query(`
          SELECT COUNT(*) as count
          FROM notifications
          WHERE user_id = @user_id AND tenant_id = @tenant_id AND is_read = 0
        `);

      return result.recordset[0].count || 0;
    } catch (error) {
      this.logger.error(`Failed to get unread count: ${error.message}`);
      return 0; // Return 0 on error to avoid breaking the UI
    }
  }

  /**
   * Get tenant ID from tenant code
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

  /**
   * Map database row to Notification interface
   */
  private mapToNotification(row: any): Notification {
    let metadata = null;
    if (row.metadata) {
      try {
        metadata = JSON.parse(row.metadata);
      } catch (e) {
        this.logger.warn(`Failed to parse notification metadata: ${e.message}`);
      }
    }

    return {
      id: row.id,
      tenant_id: row.tenant_id,
      user_id: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      metadata,
      is_read: row.is_read === 1 || row.is_read === true,
      created_at: row.created_at,
    };
  }
}

