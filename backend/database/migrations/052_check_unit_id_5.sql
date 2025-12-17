-- ============================================================
-- Check for Unit ID 5 (פיתוח)
-- Migration: 052_check_unit_id_5.sql
-- Description: Query to check if unit ID 5 exists in database
-- ============================================================

-- Check if unit ID 5 exists
SELECT 
    id,
    tenant_id,
    level_key,
    parent_id,
    name,
    code,
    is_active,
    created_at,
    updated_at
FROM org_units
WHERE id = 5;

-- Check all units with parent_id = 3 (שרון)
SELECT 
    id,
    name,
    code,
    parent_id,
    level_key,
    is_active
FROM org_units
WHERE parent_id = 3
ORDER BY id;

-- Check all units to see complete list
SELECT 
    id,
    name,
    code,
    parent_id,
    level_key,
    is_active,
    created_at
FROM org_units
ORDER BY id;

-- Check if there are any soft-deleted or inactive units
SELECT 
    id,
    name,
    code,
    parent_id,
    level_key,
    is_active
FROM org_units
WHERE is_active = 0 OR id = 5
ORDER BY id;


