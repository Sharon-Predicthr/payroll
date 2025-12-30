-- Master script to create all PayrollControlDB tables
-- Run this script to create all tables in the correct order
-- Date: 2025-12-24

USE master;
GO

-- Create database if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'PayrollControlDB')
BEGIN
    CREATE DATABASE PayrollControlDB;
    PRINT 'Database PayrollControlDB created';
END
ELSE
BEGIN
    PRINT 'Database PayrollControlDB already exists';
END
GO

USE PayrollControlDB;
GO

-- Create tables in dependency order
:r database\objects\tables\app_users.sql
:r database\objects\tables\tenants.sql
:r database\objects\tables\tenant_user_links.sql
:r database\objects\tables\scheduled_jobs.sql
:r database\objects\tables\auth_audit_log.sql

PRINT 'All tables created successfully!';
GO
