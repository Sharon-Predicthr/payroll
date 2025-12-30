# Quick verification script
# Run this after Docker starts to check if all tables exist

Write-Host "Checking tables in PayrollControlDB..." -ForegroundColor Cyan
Write-Host ""

docker exec payroll-sqlserver /opt/mssql-tools18/bin/sqlcmd 
    -S localhost 
    -U sa 
    -P MyStrongPass123! 
    -C 
    -d PayrollControlDB 
    -Q "SELECT TABLE_NAME, COUNT(*) AS ColumnCount FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' GROUP BY TABLE_NAME ORDER BY TABLE_NAME;" 
    -h -1 -W

Write-Host ""
Write-Host "Expected tables:" -ForegroundColor Yellow
Write-Host "  - app_users (7 columns)" -ForegroundColor White
Write-Host "  - tenants (11 columns)" -ForegroundColor White
Write-Host "  - tenant_user_links (5 columns)" -ForegroundColor White
Write-Host "  - scheduled_jobs (8 columns)" -ForegroundColor White
Write-Host "  - auth_audit_log (7 columns)" -ForegroundColor White
