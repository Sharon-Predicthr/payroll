USE PayrollTenantDB;
GO

-- Fix sp_add_employee: Remove start_date and end_date from employees_contracts INSERT
-- These columns don't exist in the table

ALTER PROCEDURE dbo.sp_add_employee
(
    @client_id           NVARCHAR(50),
    @employee_id         NVARCHAR(50),
    @tz_id               NVARCHAR(20),
    @first_name          NVARCHAR(100),
    @last_name           NVARCHAR(100),
    @gender              NVARCHAR(10),
    @date_of_birth       DATE,
    @hire_date           DATE,
    @employment_status   NVARCHAR(20),
    @department_number   INT,
    @employment_percent  DECIMAL(5,2) = 100.00,
    @address_line1       NVARCHAR(200) = NULL,
    @address_line2       NVARCHAR(200) = NULL,
    @city_code           INT           = 0,
    @zip_code            NVARCHAR(20)  = NULL,
    @cell_phone_number   NVARCHAR(20)  = NULL,
    @email               NVARCHAR(200) = NULL,
    @termination_date    DATE          = NULL,
    @job_title           NVARCHAR(200) = NULL,
    @site_number         INT           = NULL,
    @manager_id          NVARCHAR(50)  = NULL,
    @is_active           BIT           = 1,
    @status_code         INT           OUTPUT,
    @status_message      NVARCHAR(400) OUTPUT
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF (@employment_percent IS NULL) SET @employment_percent = 100.00;
    IF (@is_active IS NULL) SET @is_active = 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.clients WHERE client_id = @client_id)
    BEGIN SET @status_code = 10; SET @status_message = N'Client not found'; RETURN; END
    IF EXISTS (SELECT 1 FROM dbo.employees WHERE client_id = @client_id AND employee_id = @employee_id)
    BEGIN SET @status_code = 11; SET @status_message = N'Employee already exists'; RETURN; END
    IF (@gender NOT IN ('MALE','FEMALE','OTHER'))
    BEGIN SET @status_code = 13; SET @status_message = N'Invalid gender'; RETURN; END
    IF (@employment_status NOT IN ('EMPLOYEE','CONTRACTOR'))
    BEGIN SET @status_code = 14; SET @status_message = N'Invalid employment_status'; RETURN; END
    IF NOT EXISTS (SELECT 1 FROM dbo.departments WHERE client_id = @client_id AND department_number = @department_number AND active_flag = 1)
    BEGIN SET @status_code = 15; SET @status_message = N'Department not found'; RETURN; END
    IF (@employment_percent < 0 OR @employment_percent > 100)
    BEGIN SET @status_code = 16; SET @status_message = N'employment_percent out of range'; RETURN; END
    DECLARE @tz9 NVARCHAR(20) = LTRIM(RTRIM(@tz_id));
    IF (LEN(@tz9) < 8 OR LEN(@tz9) > 9 OR @tz9 NOT LIKE '[0-9]%')
    BEGIN SET @status_code = 12; SET @status_message = N'Invalid tz_id'; RETURN; END
    DECLARE @curr_period_id NVARCHAR(50), @period_start DATE, @period_end DATE;
    SELECT TOP 1 @curr_period_id = period_id, @period_start = start_date, @period_end = end_date
    FROM dbo.xlg_pay_periods WHERE client_id = @client_id AND @hire_date BETWEEN start_date AND end_date AND is_closed = 0
    ORDER BY start_date DESC;
    IF (@curr_period_id IS NULL) BEGIN SET @status_code = 17; SET @status_message = N'No current open pay period'; RETURN; END
    IF (@hire_date < @period_start OR @hire_date > @period_end)
    BEGIN SET @status_code = 17; SET @status_message = N'hire_date not in current period'; RETURN; END
    DECLARE @contract_id NVARCHAR(50) = @employee_id + '-' + CONVERT(CHAR(8), @hire_date, 112);
    BEGIN TRY
        BEGIN TRAN;
        INSERT INTO dbo.employees (client_id, employee_id, tz_id, first_name, last_name, gender, date_of_birth, address_line1, address_line2, city_code, zip_code, cell_phone_number, email, hire_date, termination_date, employment_status, job_title, department_number, site_number, employment_percent, is_active, manager_id)
        VALUES (@client_id, @employee_id, @tz9, @first_name, @last_name, @gender, @date_of_birth, @address_line1, @address_line2, @city_code, @zip_code, @cell_phone_number, @email, @hire_date, @termination_date, @employment_status, @job_title, @department_number, @site_number, @employment_percent, @is_active, @manager_id);
        INSERT INTO dbo.employees_attendance (client_id, employee_id, period_id) VALUES (@client_id, @employee_id, @curr_period_id);
        INSERT INTO dbo.employees_bank_details (client_id, employee_id, bank_code, branch_code, account_number, account_name) VALUES (@client_id, @employee_id, '0', '0', '0', '0');
        -- FIXED: Removed start_date and end_date - these columns don't exist
        INSERT INTO dbo.employees_contracts (client_id, contract_id, employee_id, employment_type, base_salary_monthly, standard_hours_per_month, hourly_rate, job_percent, annual_vacation_days, annual_sick_days, annual_havraa_days, comment)
        VALUES (@client_id, @contract_id, @employee_id, 'MONTHLY', 0, 182, 0, 100, 0, 0, 0, NULL);
        INSERT INTO dbo.employees_tax (client_id, employee_id, is_resident, company_car_benefit_group_id, additional_credit_points, special_tax_percent1, spt1_annual_threshhold, special_tax_percent2, spt2_annual_threshhold, is_tax_exempt, tax_exempt_threshold, is_bituach_leumi_special_pct, special_bl_percent, special_bl_threshhold)
        VALUES (@client_id, @employee_id, 1, NULL, 2.25, NULL, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL);
        COMMIT;
        SET @status_code = 0; SET @status_message = N'Employee created successfully';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        SET @status_code = 99; SET @status_message = ERROR_MESSAGE();
    END CATCH
END;
GO

