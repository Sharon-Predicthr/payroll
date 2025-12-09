-- ============================================================================
-- FOREIGN KEY CONSTRAINTS FOR Payroll_v01
-- ============================================================================
-- Run this script to add referential integrity to your database
-- Review each constraint before applying in production
-- ============================================================================

USE Payroll_v01;
GO

PRINT 'Creating Foreign Key Constraints...';
GO

-- ============================================================================
-- CORE ENTITY RELATIONSHIPS
-- ============================================================================

-- Clients (Root Entity)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_departments_client')
BEGIN
    ALTER TABLE dbo.departments
    ADD CONSTRAINT FK_departments_client 
    FOREIGN KEY (client_id) REFERENCES dbo.clients(client_id);
    PRINT 'Created: FK_departments_client';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_employees_client')
BEGIN
    ALTER TABLE dbo.employees
    ADD CONSTRAINT FK_employees_client 
    FOREIGN KEY (client_id) REFERENCES dbo.clients(client_id);
    PRINT 'Created: FK_employees_client';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_employees_department')
BEGIN
    ALTER TABLE dbo.employees
    ADD CONSTRAINT FK_employees_department 
    FOREIGN KEY (client_id, department_number) 
    REFERENCES dbo.departments(client_id, department_number);
    PRINT 'Created: FK_employees_department';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_employees_city')
BEGIN
    ALTER TABLE dbo.employees
    ADD CONSTRAINT FK_employees_city 
    FOREIGN KEY (city_code) REFERENCES dbo.cities(city_code);
    PRINT 'Created: FK_employees_city';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_clients_city')
BEGIN
    ALTER TABLE dbo.clients
    ADD CONSTRAINT FK_clients_city 
    FOREIGN KEY (city_code) REFERENCES dbo.cities(city_code);
    PRINT 'Created: FK_clients_city';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_clients_country')
BEGIN
    ALTER TABLE dbo.clients
    ADD CONSTRAINT FK_clients_country 
    FOREIGN KEY (country_code) REFERENCES dbo.countries(country_code);
    PRINT 'Created: FK_clients_country';
END

-- ============================================================================
-- BANKING RELATIONSHIPS
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_branches_bank')
BEGIN
    ALTER TABLE dbo.banks_branches
    ADD CONSTRAINT FK_branches_bank 
    FOREIGN KEY (bank_id) REFERENCES dbo.banks(bank_id);
    PRINT 'Created: FK_branches_bank';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_emp_bank_client')
BEGIN
    ALTER TABLE dbo.employee_bank_details
    ADD CONSTRAINT FK_emp_bank_client 
    FOREIGN KEY (client_id) REFERENCES dbo.clients(client_id);
    PRINT 'Created: FK_emp_bank_client';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_emp_bank_employee')
BEGIN
    ALTER TABLE dbo.employee_bank_details
    ADD CONSTRAINT FK_emp_bank_employee 
    FOREIGN KEY (client_id, employee_id) 
    REFERENCES dbo.employees(client_id, employee_id);
    PRINT 'Created: FK_emp_bank_employee';
END

-- ============================================================================
-- EMPLOYEE PROFILE RELATIONSHIPS
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_emp_tax_employee')
BEGIN
    ALTER TABLE dbo.employee_tax_profile
    ADD CONSTRAINT FK_emp_tax_employee 
    FOREIGN KEY (client_id, employee_id) 
    REFERENCES dbo.employees(client_id, employee_id);
    PRINT 'Created: FK_emp_tax_employee';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_emp_pension_employee')
BEGIN
    ALTER TABLE dbo.employee_pension_profile
    ADD CONSTRAINT FK_emp_pension_employee 
    FOREIGN KEY (client_id, employee_id) 
    REFERENCES dbo.employees(client_id, employee_id);
    PRINT 'Created: FK_emp_pension_employee';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_emp_pay_items_employee')
BEGIN
    ALTER TABLE dbo.employee_pay_items
    ADD CONSTRAINT FK_emp_pay_items_employee 
    FOREIGN KEY (client_id, employee_id) 
    REFERENCES dbo.employees(client_id, employee_id);
    PRINT 'Created: FK_emp_pay_items_employee';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_emp_pay_items_code')
BEGIN
    ALTER TABLE dbo.employee_pay_items
    ADD CONSTRAINT FK_emp_pay_items_code 
    FOREIGN KEY (item_code) REFERENCES dbo.pay_item_codes(item_code);
    PRINT 'Created: FK_emp_pay_items_code';
END

-- ============================================================================
-- CONTRACTS & ATTENDANCE
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_contracts_employee')
BEGIN
    ALTER TABLE dbo.employees_contracts
    ADD CONSTRAINT FK_contracts_employee 
    FOREIGN KEY (client_id, employee_id) 
    REFERENCES dbo.employees(client_id, employee_id);
    PRINT 'Created: FK_contracts_employee';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_attendance_employee')
BEGIN
    ALTER TABLE dbo.employees_attendance
    ADD CONSTRAINT FK_attendance_employee 
    FOREIGN KEY (client_id, employee_id) 
    REFERENCES dbo.employees(client_id, employee_id);
    PRINT 'Created: FK_attendance_employee';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_attendance_period')
BEGIN
    ALTER TABLE dbo.employees_attendance
    ADD CONSTRAINT FK_attendance_period 
    FOREIGN KEY (client_id, period_id) 
    REFERENCES dbo.pay_periods(client_id, period_id);
    PRINT 'Created: FK_attendance_period';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_leave_balances_employee')
BEGIN
    ALTER TABLE dbo.employees_leave_balances
    ADD CONSTRAINT FK_leave_balances_employee 
    FOREIGN KEY (client_id, employee_id) 
    REFERENCES dbo.employees(client_id, employee_id);
    PRINT 'Created: FK_leave_balances_employee';
END

-- ============================================================================
-- PAYROLL PROCESSING
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_periods_client')
BEGIN
    ALTER TABLE dbo.pay_periods
    ADD CONSTRAINT FK_periods_client 
    FOREIGN KEY (client_id) REFERENCES dbo.clients(client_id);
    PRINT 'Created: FK_periods_client';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_runs_client')
BEGIN
    ALTER TABLE dbo.payroll_runs
    ADD CONSTRAINT FK_runs_client 
    FOREIGN KEY (client_id) REFERENCES dbo.clients(client_id);
    PRINT 'Created: FK_runs_client';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_runs_period')
BEGIN
    ALTER TABLE dbo.payroll_runs
    ADD CONSTRAINT FK_runs_period 
    FOREIGN KEY (client_id, period_id) 
    REFERENCES dbo.pay_periods(client_id, period_id);
    PRINT 'Created: FK_runs_period';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_run_lines_run')
BEGIN
    ALTER TABLE dbo.payslip_run_lines
    ADD CONSTRAINT FK_run_lines_run 
    FOREIGN KEY (client_id, payroll_run_id) 
    REFERENCES dbo.payroll_runs(client_id, payroll_run_id);
    PRINT 'Created: FK_run_lines_run';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_run_lines_employee')
BEGIN
    ALTER TABLE dbo.payslip_run_lines
    ADD CONSTRAINT FK_run_lines_employee 
    FOREIGN KEY (client_id, employee_id) 
    REFERENCES dbo.employees(client_id, employee_id);
    PRINT 'Created: FK_run_lines_employee';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_run_lines_item_code')
BEGIN
    ALTER TABLE dbo.payslip_run_lines
    ADD CONSTRAINT FK_run_lines_item_code 
    FOREIGN KEY (item_code) REFERENCES dbo.pay_item_codes(item_code);
    PRINT 'Created: FK_run_lines_item_code';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_payslips_employee')
BEGIN
    ALTER TABLE dbo.payslips
    ADD CONSTRAINT FK_payslips_employee 
    FOREIGN KEY (client_id, employee_id) 
    REFERENCES dbo.employees(client_id, employee_id);
    PRINT 'Created: FK_payslips_employee';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_payslips_period')
BEGIN
    ALTER TABLE dbo.payslips
    ADD CONSTRAINT FK_payslips_period 
    FOREIGN KEY (client_id, period_id) 
    REFERENCES dbo.pay_periods(client_id, period_id);
    PRINT 'Created: FK_payslips_period';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_payslips_run')
BEGIN
    ALTER TABLE dbo.payslips
    ADD CONSTRAINT FK_payslips_run 
    FOREIGN KEY (client_id, payroll_run_id) 
    REFERENCES dbo.payroll_runs(client_id, payroll_run_id);
    PRINT 'Created: FK_payslips_run';
END

PRINT '';
PRINT 'Foreign Key Constraints Creation Complete!';
PRINT 'Review the constraints and test your application.';
GO

