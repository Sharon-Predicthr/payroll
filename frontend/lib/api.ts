/**
 * API client utilities for making authenticated requests to the backend
 */

import { getAuthHeader } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeader = getAuthHeader();

  if (!authHeader) {
    throw new Error('Not authenticated');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * API client for employees
 */
export const employeesApi = {
  /**
   * Get all employees
   */
  getAll: async () => {
    return apiRequest<{ success: boolean; data: any[]; count: number }>('/employees');
  },

  /**
   * Get employee by ID
   */
  getById: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/employees/${id}`);
  },
};

