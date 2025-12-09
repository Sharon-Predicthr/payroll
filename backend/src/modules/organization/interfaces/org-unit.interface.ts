/**
 * Organization Unit Interface
 * Represents a unit in the organization tree
 */
export interface OrgUnit {
  id: number;
  tenant_id: string;
  level_key: string; // FK → org_levels.key
  parent_id: number | null; // FK → org_units.id
  name: string;
  code: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Organization Unit with Children (for tree structure)
 */
export interface OrgUnitTree extends OrgUnit {
  level?: string; // display name from org_levels
  children?: OrgUnitTree[];
}

/**
 * Employee Organization Assignment Interface
 */
export interface EmployeeOrgAssignment {
  employee_id: string;
  org_unit_id: number;
  is_primary: boolean;
  valid_from: Date;
  valid_to: Date | null;
}

