/**
 * Organization Level Interface
 * Represents a level in the organization hierarchy (1-6 levels)
 */
export interface OrgLevel {
  id: number;
  tenant_id: string;
  key: string; // internal name: region, factory, section...
  display_name: string; // tenant label
  level_order: number; // 1..6
  is_active: boolean;
  created_at: Date;
}

