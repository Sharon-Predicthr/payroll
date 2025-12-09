-- Migration: Create notifications table in Control DB
-- This table stores notifications for all tenants and users

CREATE TABLE notifications (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    type NVARCHAR(50) NOT NULL,
    title NVARCHAR(200) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    metadata NVARCHAR(MAX) NULL,
    is_read BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- Create indexes for better query performance
CREATE INDEX IX_notifications_tenant_user ON notifications(tenant_id, user_id);
CREATE INDEX IX_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IX_notifications_created_at ON notifications(created_at);

-- Add foreign key constraints (if tables exist)
-- Note: These will fail if app_users or tenants tables don't exist yet
-- You can comment them out if needed
-- ALTER TABLE notifications ADD CONSTRAINT FK_notifications_user 
--     FOREIGN KEY (user_id) REFERENCES app_users(id);
-- ALTER TABLE notifications ADD CONSTRAINT FK_notifications_tenant 
--     FOREIGN KEY (tenant_id) REFERENCES tenants(id);

