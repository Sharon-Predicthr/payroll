# Database Backups

Place your SQL Server backup files (`.bak`) in this directory.

## Usage

1. Copy your `.bak` backup file to this directory
2. Run `docker compose up --build`
3. The initialization script will automatically:
   - Restore the backup to database named `PayrollTenantDB`
   - Create a tenant entry in `PayrollControlDB` with:
     - Code: `default`
     - Name: `Default Tenant`
     - Database: `PayrollTenantDB`

## Notes

- Only the first `.bak` file found will be restored
- The database will be named `PayrollTenantDB` (fixed name for development)
- If the database already exists, it will be dropped and recreated
- The tenant entry will be created or updated in `PayrollControlDB`

## Example

```
database/
  backups/
    payroll-backup-2025-12-24.bak  <-- Place your backup here
```

After running `docker compose up --build`, the backup will be restored automatically.


