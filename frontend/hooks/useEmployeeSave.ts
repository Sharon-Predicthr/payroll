/**
 * Hook for managing employee data changes and saving them in a transaction
 */

import { useState, useCallback } from 'react';

export interface EmployeeChanges {
  master?: Record<string, any>;
  tax?: Record<string, any>;
  contracts?: {
    created?: any[];
    updated?: any[];
    deleted?: (number | string)[];
  };
  attendance?: {
    created?: any[];
    updated?: any[];
    deleted?: (number | string)[];
  };
  bank_details?: {
    created?: any[];
    updated?: any[];
    deleted?: (number | string)[];
  };
  pension?: {
    created?: any[];
    updated?: any[];
    deleted?: (number | string)[];
  };
  pay_items?: {
    created?: any[];
    updated?: any[];
    deleted?: (number | string)[];
  };
}

export function useEmployeeSave(employeeId: string | undefined) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveAll = useCallback(async (changes: EmployeeChanges) => {
    if (!employeeId) {
      setSaveError('Employee ID is required');
      return { success: false, error: 'Employee ID is required' };
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Filter out empty sections
      const payload: EmployeeChanges = {};
      if (changes.master && Object.keys(changes.master).length > 0) {
        payload.master = changes.master;
      }
      if (changes.tax && Object.keys(changes.tax).length > 0) {
        payload.tax = changes.tax;
      }
      if (changes.contracts && (
        (changes.contracts.created && changes.contracts.created.length > 0) ||
        (changes.contracts.updated && changes.contracts.updated.length > 0) ||
        (changes.contracts.deleted && changes.contracts.deleted.length > 0)
      )) {
        payload.contracts = changes.contracts;
      }
      if (changes.attendance && (
        (changes.attendance.created && changes.attendance.created.length > 0) ||
        (changes.attendance.updated && changes.attendance.updated.length > 0) ||
        (changes.attendance.deleted && changes.attendance.deleted.length > 0)
      )) {
        payload.attendance = changes.attendance;
      }
      if (changes.bank_details && (
        (changes.bank_details.created && changes.bank_details.created.length > 0) ||
        (changes.bank_details.updated && changes.bank_details.updated.length > 0) ||
        (changes.bank_details.deleted && changes.bank_details.deleted.length > 0)
      )) {
        payload.bank_details = changes.bank_details;
      }
      if (changes.pension && (
        (changes.pension.created && changes.pension.created.length > 0) ||
        (changes.pension.updated && changes.pension.updated.length > 0) ||
        (changes.pension.deleted && changes.pension.deleted.length > 0)
      )) {
        payload.pension = changes.pension;
      }
      if (changes.pay_items && (
        (changes.pay_items.created && changes.pay_items.created.length > 0) ||
        (changes.pay_items.updated && changes.pay_items.updated.length > 0) ||
        (changes.pay_items.deleted && changes.pay_items.deleted.length > 0)
      )) {
        payload.pay_items = changes.pay_items;
      }

      // Check if there are any changes to save
      if (Object.keys(payload).length === 0) {
        setIsSaving(false);
        return { success: true, message: 'No changes to save' };
      }

      console.log('[useEmployeeSave] Saving changes:', payload);
      console.log('[useEmployeeSave] Employee ID:', employeeId);
      console.log('[useEmployeeSave] Endpoint:', `/api/employees/${employeeId}/save-all`);

      // Get auth header from client-side
      const token = typeof window !== 'undefined' ? localStorage.getItem('paylens_access_token') : null;
      console.log('[useEmployeeSave] Token exists:', !!token);
      if (!token) {
        setSaveError('לא מאומת - נא להתחבר מחדש');
        setIsSaving(false);
        return { success: false, error: 'לא מאומת - נא להתחבר מחדש' };
      }

      const response = await fetch(`/api/employees/${employeeId}/save-all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('[useEmployeeSave] Response status:', response.status);
      console.log('[useEmployeeSave] Response URL:', response.url);

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.message || `Failed to save: ${response.status}`;
        setSaveError(errorMessage);
        console.error('[useEmployeeSave] Save failed:', result);
        
        // Log operation log if available for debugging
        if (result.operationLog) {
          console.error('[useEmployeeSave] Operation log:', result.operationLog);
        }
        
        return {
          success: false,
          error: errorMessage,
          details: result.details,
          operationLog: result.operationLog,
        };
      }

      console.log('[useEmployeeSave] Save successful:', result);
      setIsSaving(false);
      return {
        success: true,
        message: result.message,
        details: result.details,
      };
    } catch (error: any) {
      const errorMessage = error.message || 'שגיאה בשמירת הנתונים';
      setSaveError(errorMessage);
      console.error('[useEmployeeSave] Save error:', error);
      setIsSaving(false);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [employeeId]);

  return {
    saveAll,
    isSaving,
    saveError,
    clearError: () => setSaveError(null),
  };
}

