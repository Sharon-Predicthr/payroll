/**
 * Route Map - Defines which routes use Control DB vs Tenant DB
 */

// Routes that use CONTROL database (shared across all tenants)
export const CONTROL_ROUTES = [
  '/api/auth',
  '/api/notifications',
  '/api/tenants',
  '/api/users',
  '/api/jobs', // Jobs are stored in Control DB
];

// Routes that use TENANT database (tenant-specific)
export const TENANT_ROUTES = [
  '/api/employees',
  '/api/payroll',
  '/api/departments',
  '/api/banking',
  '/api/schedules',
  '/api/time-tracking',
  '/api/country-rules',
  '/api/org', // Organization structure module
];

/**
 * Check if a route belongs to control DB routes
 */
export function isControlRoute(path: string): boolean {
  return CONTROL_ROUTES.some(route => path.startsWith(route));
}

/**
 * Check if a route belongs to tenant DB routes
 */
export function isTenantRoute(path: string): boolean {
  return TENANT_ROUTES.some(route => path.startsWith(route));
}

/**
 * Get route type (control or tenant)
 */
export function getRouteType(path: string): 'control' | 'tenant' | 'unknown' {
  if (isControlRoute(path)) {
    return 'control';
  }
  if (isTenantRoute(path)) {
    return 'tenant';
  }
  return 'unknown';
}

