# Database Tables

This directory contains CREATE TABLE scripts for all tables in the PayrollControlDB database.

## Tables

- **app_users.sql** - Application users table
- **tenants.sql** - Multi-tenant organization table
- **tenant_user_links.sql** - Links users to tenants with roles
- **scheduled_jobs.sql** - Scheduled job definitions
- **auth_audit_log.sql** - Authentication audit log

## Usage

To recreate all tables, run the scripts in order:

1. app_users.sql
2. tenants.sql
3. tenant_user_links.sql (depends on app_users and tenants)
4. scheduled_jobs.sql
5. auth_audit_log.sql

Or run all scripts using:

`sql
:r database\objects\tables\app_users.sql
:r database\objects\tables\tenants.sql
:r database\objects\tables\tenant_user_links.sql
:r database\objects\tables\scheduled_jobs.sql
:r database\objects\tables\auth_audit_log.sql
`

## Notes

- All scripts use IF NOT EXISTS to prevent errors if tables already exist
- Scripts include indexes and constraints
- Generated from PayrollControlDB database structure
