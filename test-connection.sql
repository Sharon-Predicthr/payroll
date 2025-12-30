-- Test connection script for SSMS
-- Run this in SSMS after connecting

USE PayrollControlDB;
GO

SELECT 'Connection successful!' AS Status;
SELECT name FROM sys.databases WHERE name = 'PayrollControlDB';
SELECT COUNT(*) AS 'User Count' FROM app_users;
SELECT COUNT(*) AS 'Tenant Count' FROM tenants;
GO
