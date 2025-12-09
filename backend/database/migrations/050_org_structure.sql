-- ============================================================
-- Organization Structure Module
-- Migration: 050_org_structure.sql
-- Description: Creates tables for flexible organization tree (1-6 levels)
-- ============================================================

-- ============================================================
-- 1) org_levels
-- ============================================================
CREATE TABLE org_levels (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    [key] NVARCHAR(50) NOT NULL,           -- internal name: region, factory, section...
    display_name NVARCHAR(100) NOT NULL,  -- tenant label
    level_order INT NOT NULL,             -- 1..6
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Unique constraints
ALTER TABLE org_levels
    ADD CONSTRAINT UQ_org_levels_tenant_key UNIQUE (tenant_id, [key]);

ALTER TABLE org_levels
    ADD CONSTRAINT UQ_org_levels_tenant_order UNIQUE (tenant_id, level_order);

-- Index for performance
CREATE INDEX IX_org_levels_tenant_active ON org_levels (tenant_id, is_active, level_order);

-- ============================================================
-- 2) org_units
-- ============================================================
CREATE TABLE org_units (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    level_key NVARCHAR(50) NOT NULL,      -- FK → org_levels.key
    parent_id BIGINT NULL,                -- FK → org_units.id
    name NVARCHAR(200) NOT NULL,
    code NVARCHAR(50) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Unique constraint
ALTER TABLE org_units
    ADD CONSTRAINT UQ_org_units_tenant_code UNIQUE (tenant_id, code);

-- Foreign keys
ALTER TABLE org_units
    ADD CONSTRAINT FK_org_units_level
    FOREIGN KEY (tenant_id, level_key) REFERENCES org_levels(tenant_id, [key]);

ALTER TABLE org_units
    ADD CONSTRAINT FK_org_units_parent
    FOREIGN KEY (parent_id) REFERENCES org_units(id);

-- Indexes for performance
CREATE INDEX IX_org_units_tenant_level ON org_units (tenant_id, level_key, is_active);
CREATE INDEX IX_org_units_parent ON org_units (parent_id);
CREATE INDEX IX_org_units_tenant_active ON org_units (tenant_id, is_active);

-- ============================================================
-- 3) employee_org_assignment
-- ============================================================
CREATE TABLE employee_org_assignment (
    employee_id UNIQUEIDENTIFIER NOT NULL,
    org_unit_id BIGINT NOT NULL,
    is_primary BIT NOT NULL DEFAULT 1,
    valid_from DATE NOT NULL DEFAULT GETDATE(),
    valid_to DATE NULL,
    PRIMARY KEY (employee_id, org_unit_id),
    FOREIGN KEY (org_unit_id) REFERENCES org_units(id)
);

-- Indexes for performance
CREATE INDEX IX_employee_org_assignment_employee ON employee_org_assignment (employee_id);
CREATE INDEX IX_employee_org_assignment_unit ON employee_org_assignment (org_unit_id);
CREATE INDEX IX_employee_org_assignment_valid ON employee_org_assignment (valid_from, valid_to);

