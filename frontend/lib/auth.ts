/**
 * Authentication utilities for managing tokens and auth state
 */

const TOKEN_KEY = 'paylens_access_token';
const USER_KEY = 'paylens_user';
const TENANT_KEY = 'paylens_tenant';

export interface AuthUser {
  id: string;
  email: string;
  role?: string; // PAYROLL_MANAGER or EMPLOYEE
}

export interface AuthTenant {
  code: string;
  name: string;
}

export interface AuthData {
  access_token: string;
  user: AuthUser;
  tenant: AuthTenant;
}

/**
 * Save authentication data to localStorage
 */
export function saveAuthData(data: AuthData): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  localStorage.setItem(TENANT_KEY, JSON.stringify(data.tenant));
}

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get user data from localStorage
 */
export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Get tenant data from localStorage
 */
export function getTenant(): AuthTenant | null {
  if (typeof window === 'undefined') return null;
  const tenantStr = localStorage.getItem(TENANT_KEY);
  return tenantStr ? JSON.parse(tenantStr) : null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

/**
 * Clear all authentication data
 */
export function clearAuthData(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TENANT_KEY);
}

/**
 * Get authorization header value
 */
export function getAuthHeader(): string | null {
  const token = getAccessToken();
  return token ? `Bearer ${token}` : null;
}

/**
 * Get user role from JWT token
 */
export function getUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  
  const token = getAccessToken();
  if (!token) return null;

  try {
    // Decode JWT token (base64)
    const payload = token.split('.')[1];
    if (!payload) return null;
    
    const decoded = JSON.parse(atob(payload));
    return decoded.role || null;
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
}

/**
 * Check if user is admin (PAYROLL_MANAGER)
 */
export function isAdmin(): boolean {
  return getUserRole() === 'PAYROLL_MANAGER';
}

