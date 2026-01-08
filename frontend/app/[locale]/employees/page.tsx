"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { PageShell } from "@/components/PageShell";
import { EmployeeList } from "@/components/EmployeeList";
import { EmployeeDetail } from "@/components/EmployeeDetail";
import { EmployeeListSkeleton } from "@/components/EmployeeListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toast } from "@/components/ui/toast";
import { useDirection } from "@/contexts/DirectionContext";
import { isAuthenticated } from "@/lib/auth";
import { AddEmployeeDialog } from "./components/AddEmployeeDialog";
import { LookupSelect } from "@/components/LookupSelect/LookupSelect";
import { usePayrollPeriod } from "@/contexts/PayrollPeriodContext";
import { getAuthHeader } from "@/lib/auth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Backend employee interface (from API)
interface BackendEmployee {
  id: string;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  department_id?: string;
  position?: string;
  status?: string;
  hire_date?: Date;
}

// Frontend employee interface (for UI)
interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  status: "Active" | "Inactive" | "On Leave";
  country: string;
  employmentType: "Full-time" | "Part-time" | "Contract";
  avatar?: string;
}

// Convert backend employee to frontend format
function mapBackendToFrontend(backend: BackendEmployee): Employee {
  return {
    id: backend.id,
    name: backend.full_name || `${backend.first_name || ''} ${backend.last_name || ''}`.trim() || backend.employee_code || 'Unknown',
    email: backend.email || '',
    department: backend.department_id || 'N/A',
    position: backend.position || 'N/A',
    status: (backend.status as any) || 'Active',
    country: 'N/A', // Not in backend data yet
    employmentType: 'Full-time', // Not in backend data yet
  };
}

export default function EmployeesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const { direction } = useDirection();
  const t = useTranslations('employees');
  const tCommon = useTranslations('common');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [listWidth, setListWidth] = useState(35); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [showAddEmployeeDialog, setShowAddEmployeeDialog] = useState(false);
  const [userManuallySelected, setUserManuallySelected] = useState(false); // Track if user manually selected an employee
  const prevPathnameRef = useRef<string | null>(null);
  const [processingPayslips, setProcessingPayslips] = useState(false);
  const { selectedPeriod } = usePayrollPeriod();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Fetch employees function - defined before useEffects to avoid dependency issues
  const fetchEmployees = async (): Promise<Employee[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('paylens_access_token');
      console.log('[EmployeesPage] ===== Fetching employees =====');
      console.log('[EmployeesPage] Token exists:', !!token);
      console.log('[EmployeesPage] Token length:', token?.length || 0);
      console.log('[EmployeesPage] Page:', currentPage, 'Limit:', pageSize);
      
      if (!token) {
        console.error('[EmployeesPage] No token found, redirecting to login');
        router.push(`/${locale}/login`);
        return;
      }
      
      // Add timestamp to prevent caching
      const url = `/api/employees?page=${currentPage}&limit=${pageSize}&_t=${Date.now()}`;
      console.log('[EmployeesPage] Making request to:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        cache: 'no-store', // Force fresh fetch
        next: { revalidate: 0 }, // Disable cache
      });
      
      console.log('[EmployeesPage] Response status:', response.status);
      console.log('[EmployeesPage] Response ok:', response.ok);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('[EmployeesPage] Error response:', errorData);
        throw new Error(errorData.message || `Failed to fetch employees (${response.status})`);
      }

      const data = await response.json();
      console.log('[EmployeesPage] Response data:', JSON.stringify(data, null, 2));
      
      // Handle both success format and direct data format
      let employeesData = null;
      let paginationData = null;
      
      if (data.success && data.data) {
        // Backend returns { success: true, data: [...], pagination: {...} }
        employeesData = data.data;
        paginationData = data.pagination;
      } else if (Array.isArray(data)) {
        // Direct array response
        employeesData = data;
      } else if (data.data && Array.isArray(data.data)) {
        // Nested data format
        employeesData = data.data;
        paginationData = data.pagination;
      } else {
        console.warn('[EmployeesPage] Unexpected response format:', data);
        setError('Invalid response format from server');
        setEmployees([]);
        return [];
      }
      
      if (!employeesData || !Array.isArray(employeesData)) {
        console.warn('[EmployeesPage] No employees array in response');
        setError('No employees data received');
        setEmployees([]);
        return;
      }
      
      console.log('[EmployeesPage] Received', employeesData.length, 'employees');
      console.log('[EmployeesPage] Raw employees data:', employeesData);
      const mappedEmployees = employeesData.map(mapBackendToFrontend);
      console.log('[EmployeesPage] Mapped employees:', mappedEmployees.length);
      console.log('[EmployeesPage] Mapped employees list:', mappedEmployees.map(e => ({ id: e.id, name: e.name })));
      
      // Always use server data directly - build names from DB
      // This ensures we always show the latest data from the database
      setEmployees(mappedEmployees);
      
      // Use functional update to get current selectedEmployee
      setSelectedEmployee(prevSelected => {
        if (!prevSelected) return prevSelected;
        const updatedEmployee = mappedEmployees.find(emp => emp.id === prevSelected.id);
        if (updatedEmployee) {
          console.log('[EmployeesPage] Updating selected employee from list:', updatedEmployee.name);
          // Preserve any other properties from prevSelected that might not be in the list
          return { ...prevSelected, ...updatedEmployee };
        }
        return prevSelected;
      });
      
      // Update pagination info
      if (paginationData) {
        setTotalEmployees(paginationData.total || employeesData.length);
        setTotalPages(paginationData.totalPages || Math.ceil(employeesData.length / pageSize));
      } else {
        // Fallback: assume we have all data if no pagination info
        setTotalEmployees(employeesData.length);
        setTotalPages(Math.ceil(employeesData.length / pageSize));
      }
      
      console.log('[EmployeesPage] ✅ Successfully fetched employees');
      return mappedEmployees;
    } catch (err: any) {
      console.error('[EmployeesPage] ❌ Error fetching employees:', err);
      console.error('[EmployeesPage] Error stack:', err.stack);
      setError(err.message || 'Failed to load employees. Please check console for details.');
      setEmployees([]);
      return []; // Return empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees on mount, when pagination changes, and ALWAYS when entering the page
  // This ensures fresh data from DB every time we enter the employees page
  useEffect(() => {
    const token = localStorage.getItem('paylens_access_token');
    console.log('[Frontend] useEffect - Token check:', !!token, 'pathname:', pathname);
    
    if (!isAuthenticated() || !token) {
      console.log('[Frontend] Not authenticated, redirecting to login');
      router.push(`/${locale}/login`);
      return;
    }

    // ALWAYS refresh from DB when this effect runs (mount or pathname change)
    console.log('[Frontend] Refreshing employees list directly from DB');
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, currentPage, pageSize, pathname]);

  // Refresh employees when page becomes visible (user returns to tab/window)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible - refresh employees from DB
        console.log('[Frontend] Page became visible, refreshing employees from DB');
        const token = localStorage.getItem('paylens_access_token');
        if (token && isAuthenticated()) {
          fetchEmployees();
        }
      }
    };

    const handleFocus = () => {
      // Window gained focus - refresh employees from DB
      console.log('[Frontend] Window gained focus, refreshing employees from DB');
      const token = localStorage.getItem('paylens_access_token');
      if (token && isAuthenticated()) {
        fetchEmployees();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Fetch employee detail when selected
  useEffect(() => {
    if (selectedEmployee) {
      console.log('[Frontend] Employee selected, fetching detail for:', selectedEmployee.id, selectedEmployee.name);
      fetchEmployeeDetail(selectedEmployee.id);
    } else {
      console.log('[Frontend] No employee selected, clearing detail');
      setSelectedEmployeeDetail(null);
      setLoadingDetail(false);
    }
  }, [selectedEmployee]);

  // Update selectedEmployee name and employees list when selectedEmployeeDetail changes (after save or fetch)
  useEffect(() => {
    if (selectedEmployeeDetail && selectedEmployee && selectedEmployeeDetail.id === selectedEmployee.id) {
      const updatedName = selectedEmployeeDetail.full_name || 
        `${selectedEmployeeDetail.first_name || ''} ${selectedEmployeeDetail.last_name || ''}`.trim();
      if (updatedName && updatedName !== selectedEmployee.name) {
        console.log('[EmployeesPage] useEffect - Updating selectedEmployee name from detail:', updatedName, 'old name:', selectedEmployee.name);
        setSelectedEmployee(prev => {
          if (!prev || prev.id !== selectedEmployeeDetail.id) return prev;
          console.log('[EmployeesPage] useEffect - Setting new name:', updatedName);
          return { ...prev, name: updatedName };
        });
        
        // Also update the employee in the list if it exists there - use functional update to ensure it's applied
        setEmployees(prev => {
          const employeeIndex = prev.findIndex(emp => emp.id === selectedEmployeeDetail.id);
          if (employeeIndex >= 0) {
            const currentEmp = prev[employeeIndex];
            // Only update if the name is actually different (avoid unnecessary re-renders)
            if (currentEmp.name !== updatedName) {
              const updatedList = [...prev];
              updatedList[employeeIndex] = { ...updatedList[employeeIndex], name: updatedName };
              console.log('[EmployeesPage] useEffect - Updated employee in list at index:', employeeIndex, 'new name:', updatedName);
              return updatedList;
            }
          }
          return prev;
        });
      }
    }
  }, [selectedEmployeeDetail, selectedEmployee]);

  const fetchEmployeeDetail = async (employeeId: string) => {
    if (!employeeId) {
      setSelectedEmployeeDetail(null);
      setLoadingDetail(false);
      return;
    }

    try {
      setLoadingDetail(true);
      setSelectedEmployeeDetail(null); // Clear previous detail while loading
      
      const token = localStorage.getItem('paylens_access_token');
      if (!token) {
        router.push(`/${locale}/login`);
        setLoadingDetail(false);
        return;
      }
      
      console.log('[Frontend] Fetching employee detail for ID:', employeeId);
      const response = await fetch(`/api/employees/${employeeId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('[Frontend] Employee detail response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch employee details' }));
        console.error('[Frontend] Employee detail error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch employee details');
      }

      const data = await response.json();
      console.log('[Frontend] Employee detail data:', data);
      
      if (data.success && data.data) {
        setSelectedEmployeeDetail(data.data);
      } else {
        console.warn('[Frontend] Unexpected employee detail response format:', data);
        setSelectedEmployeeDetail(null);
      }
    } catch (err: any) {
      console.error('[Frontend] Error fetching employee detail:', err);
      setSelectedEmployeeDetail(null);
      // Don't set global error for detail fetch failures, just log it
      // setError(err.message || 'Failed to load employee details');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterCountry, setFilterCountry] = useState<string | null>(null);
  const [filterEmploymentType, setFilterEmploymentType] = useState<string | null>(null);
  const [filterIsActive, setFilterIsActive] = useState<string>("all"); // "all" | "active" | "inactive"
  
  // Sorting is handled by DataGrid internally (via localStorage)
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter employees (DataGrid will handle sorting internally)
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp: any) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesDepartment = !filterDepartment || emp.department === filterDepartment;
      const matchesStatus = !filterStatus || emp.status === filterStatus;
      const matchesCountry = !filterCountry || emp.country === filterCountry;
      const matchesEmploymentType = !filterEmploymentType || emp.employmentType === filterEmploymentType;
      const matchesIsActive = 
        filterIsActive === "all" || 
        (filterIsActive === "active" && emp.is_active === true) ||
        (filterIsActive === "inactive" && emp.is_active === false);

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesStatus &&
        matchesCountry &&
        matchesEmploymentType &&
        matchesIsActive
      );
    });
  }, [employees, debouncedSearchQuery, filterDepartment, filterStatus, filterCountry, filterEmploymentType, filterIsActive]);

  // Track the sorted data from DataGrid
  const [sortedEmployees, setSortedEmployees] = useState<Employee[]>(filteredEmployees);

  // Update sorted employees when filtered employees change
  useEffect(() => {
    setSortedEmployees(filteredEmployees);
  }, [filteredEmployees]);

  // Handle sorted data change from DataGrid
  const handleSortedDataChange = useCallback((sortedData: Employee[]) => {
    console.log('[EmployeesPage] DataGrid sorted data changed, first employee:', sortedData[0]?.id, sortedData[0]?.name);
    setSortedEmployees(sortedData);
    
    // Auto-select first employee from sorted list if no employee is selected
    // This ensures we select what's actually displayed in the DataGrid
    if (sortedData.length > 0 && !selectedEmployee) {
      const firstEmployee = sortedData[0];
      console.log('[EmployeesPage] ✅ Auto-selecting first employee from DataGrid sorted list:', firstEmployee.id, firstEmployee.name);
      setSelectedEmployee(firstEmployee);
      setUserManuallySelected(false);
    }
  }, [selectedEmployee]);

  // Handle sort change from DataGrid
  const handleSortChange = useCallback((sortColumn: string | null, sortDirection: 'asc' | 'desc') => {
    // DataGrid handles sorting internally, we just need to track it
    // The sorted data will be available through onSortedDataChange
  }, []);

  // Auto-select first employee when employees are loaded (fallback if DataGrid hasn't called onSortedDataChange yet)
  useEffect(() => {
    if (loading || employees.length === 0) {
      return;
    }

    // Only select if no employee is selected and we have filtered employees
    // The DataGrid will call onSortedDataChange with the sorted list, which will handle the selection
    // This is just a fallback in case DataGrid doesn't call it immediately
    if (!selectedEmployee && filteredEmployees.length > 0) {
      // Wait a bit for DataGrid to process and call onSortedDataChange
      const timeoutId = setTimeout(() => {
        // If still no selection after DataGrid had time to process, select first from filtered
        if (!selectedEmployee && filteredEmployees.length > 0) {
          const firstEmployee = filteredEmployees[0];
          console.log('[EmployeesPage] ✅ Fallback: Auto-selecting first employee from filtered list:', firstEmployee.id, firstEmployee.name);
          setSelectedEmployee(firstEmployee);
          setUserManuallySelected(false);
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [employees, loading, filteredEmployees, selectedEmployee]);

  // Auto-select first employee when sorted list changes (after filtering/sorting)
  // Use sortedEmployees to match what's actually displayed in DataGrid
  useEffect(() => {
    if (loading || sortedEmployees.length === 0) {
      return;
    }

    // Check if selected employee still exists in sorted list
    const selectedStillInList = selectedEmployee && 
      sortedEmployees.some(emp => emp.id === selectedEmployee.id);

    // If selected employee is not in sorted list, select the first one (as displayed in DataGrid)
    if (!selectedStillInList && !userManuallySelected) {
      const firstEmployee = sortedEmployees[0];
      if (firstEmployee) {
        console.log('[EmployeesPage] Auto-selecting first employee from sorted list (selected not in list):', firstEmployee.id, firstEmployee.name);
        setSelectedEmployee(firstEmployee);
      }
    }
  }, [sortedEmployees, loading, selectedEmployee, userManuallySelected]);

  // Check if any filters are active
  const hasActiveFilters = 
    debouncedSearchQuery !== "" ||
    filterDepartment !== null ||
    filterStatus !== null ||
    filterCountry !== null ||
    filterEmploymentType !== null ||
    filterIsActive !== "all";

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setFilterDepartment(null);
    setFilterStatus(null);
    setFilterCountry(null);
    setFilterEmploymentType(null);
    setFilterIsActive("all");
    // Sorting is handled by DataGrid internally
  };

  const handleSave = async () => {
    const savedEmployeeId = selectedEmployee?.id;
    
    if (!savedEmployeeId) {
      setToastMessage(t('savedSuccess'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    
    // First, refresh employee detail to get the latest data including updated name
    const token = localStorage.getItem('paylens_access_token');
    if (token) {
      try {
        const detailResponse = await fetch(`/api/employees/${savedEmployeeId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          cache: 'no-store',
        });
        
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          if (detailData.success && detailData.data) {
            const updatedDetail = detailData.data;
            setSelectedEmployeeDetail(updatedDetail);
            
            // Immediately update selectedEmployee name from the detail
            const updatedName = updatedDetail.full_name || 
              `${updatedDetail.first_name || ''} ${updatedDetail.last_name || ''}`.trim();
            if (updatedName) {
              console.log('[EmployeesPage] handleSave - Immediately updating selectedEmployee name:', updatedName);
              setSelectedEmployee(prev => {
                if (!prev || prev.id !== savedEmployeeId) return prev;
                return { ...prev, name: updatedName };
              });
              
              // IMPORTANT: Update employees list IMMEDIATELY (synchronously) before fetchEmployees
              // This ensures the name is updated in the list right away, regardless of pagination
              setEmployees(prev => {
                const employeeIndex = prev.findIndex(emp => emp.id === savedEmployeeId);
                if (employeeIndex >= 0) {
                  const updatedList = [...prev];
                  updatedList[employeeIndex] = { ...updatedList[employeeIndex], name: updatedName };
                  console.log('[EmployeesPage] handleSave - Updated employee in list at index:', employeeIndex, 'new name:', updatedName);
                  return updatedList;
                }
                console.log('[EmployeesPage] handleSave - Employee not found in current list, will be updated by fetchEmployees');
                return prev;
              });
            }
          }
        }
      } catch (err) {
        console.error('[EmployeesPage] Error fetching updated employee detail:', err);
      }
    }
    
    // Then refresh the employees list to update names in sidebar (in case employee is on a different page)
    await fetchEmployees();
    
    setToastMessage(t('savedSuccess'));
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleTerminate = async (employeeId: string) => {
    if (!confirm(t('terminateConfirm'))) {
      return;
    }

    try {
      const token = localStorage.getItem('paylens_access_token');
      if (!token) {
        router.push(`/${locale}/login`);
        return;
      }

      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to terminate employee');
      }

      // Remove employee from list
      setEmployees(employees.filter(emp => emp.id !== employeeId));
      
      // Clear selection if terminated employee was selected
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee(null);
        setSelectedEmployeeDetail(null);
      }

      setToastMessage(t('terminatedSuccess'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
      // Refresh employees list
      fetchEmployees();
    } catch (err: any) {
      console.error('Error terminating employee:', err);
      setError(err.message || 'Failed to terminate employee');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = listWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector('[data-split-container]') as HTMLElement;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const diffX = e.clientX - startX;
      // In RTL, reverse the direction of resize
      const diffPercent = direction === "rtl" 
        ? -(diffX / containerRect.width) * 100 
        : (diffX / containerRect.width) * 100;
      const newWidth = startWidth + diffPercent;
      const clampedWidth = Math.max(25, Math.min(60, newWidth)); // Min 25%, Max 60%
      setListWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Debug: Log when employees page renders
  useEffect(() => {
    console.log('[EmployeesPage] Component mounted/updated');
    console.log('[EmployeesPage] Checking for elements that might block sidebar');
    
    // Check if there are any elements covering the sidebar
    const checkForBlockingElements = () => {
      const sidebar = document.querySelector('aside');
      if (sidebar) {
        const sidebarRect = sidebar.getBoundingClientRect();
        console.log('[EmployeesPage] Sidebar position:', sidebarRect);
        
        // Check for elements at the same position
        const elementsAtSidebarPosition = document.elementsFromPoint(
          sidebarRect.left + 10,
          sidebarRect.top + 100
        );
        console.log('[EmployeesPage] Elements at sidebar position:', elementsAtSidebarPosition);
        
        elementsAtSidebarPosition.forEach((el, index) => {
          if (el !== sidebar && !sidebar.contains(el)) {
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            console.log(`[EmployeesPage] Element ${index} blocking sidebar:`, {
              tag: el.tagName,
              id: el.id,
              className: el.className,
              position: styles.position,
              zIndex: styles.zIndex,
              pointerEvents: styles.pointerEvents,
              rect: rect,
            });
          }
        });
      }
    };
    
    // Check immediately and after a delay
    checkForBlockingElements();
    setTimeout(checkForBlockingElements, 1000);
  }, []);

  return (
    <PageShell>
      {/* Toast */}
      {showToast && (
        <Toast
          message={toastMessage || t('messages.operationSuccess')}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            {/* Breadcrumb */}
            <nav className="text-sm text-text-muted mb-2">
              <button
                onClick={() => router.push(`/${locale}`)}
                className="hover:text-text-main cursor-pointer"
              >
                {t('breadcrumb.home')}
              </button>
              <span className="mx-2">/</span>
              <span className="text-text-main font-medium">{t('title')}</span>
            </nav>
            <h1 className="text-2xl font-semibold text-text-main">{t('title')}</h1>
          </div>
          <div className="flex gap-2">
            {(selectedEmployeeIds.size > 0 || employees.length > 0) && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (!selectedPeriod) {
                    alert("אנא בחר תקופת שכר");
                    return;
                  }
                  
                  if (processingPayslips) {
                    return;
                  }
                  
                  try {
                    setProcessingPayslips(true);
                    
                    const authHeader = getAuthHeader();
                    if (!authHeader) {
                      alert("לא מאומת");
                      setProcessingPayslips(false);
                      return;
                    }
                    
                    const response = await fetch("/api/payslips/process", {
                      method: "POST",
                      headers: {
                        Authorization: authHeader,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        period_id: selectedPeriod.period_id,
                        process_all: true,
                      }),
                    });
                    
                    const data = await response.json();
                    
                    if (!response.ok) {
                      throw new Error(data.message || "Failed to process payroll");
                    }
                    
                    if (data.success && data.data) {
                      const result = data.data;
                      if (result.processed > 0) {
                        // Navigate to payslips page to see the created payslips
                        router.push(`/${locale}/payslips`);
                      } else {
                        alert("לא עובדו תלושי שכר");
                        setProcessingPayslips(false);
                      }
                    } else {
                      throw new Error("Unexpected response format");
                    }
                  } catch (err: any) {
                    console.error("Error processing payroll:", err);
                    alert(`❌ שגיאה: ${err.message || "Unknown error"}`);
                    setProcessingPayslips(false);
                  }
                }}
                disabled={processingPayslips || !selectedPeriod}
                className="flex items-center gap-2"
              >
                {processingPayslips ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    מעבד שכר...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    צור תלושי שכר
                  </>
                )}
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => setShowAddEmployeeDialog(true)}
            >
              <svg className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('addEmployee')}
            </Button>
          </div>
        </div>

        {/* Toolbar - Compact Single Row */}
        <div className="bg-card-bg rounded-xl border border-gray-200 shadow-sm p-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Search */}
            <div className="flex-1 min-w-[180px]">
              <div className="relative">
                <Input
                  type="search"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 rtl:pl-0 rtl:pr-8 h-9 text-sm"
                />
                <svg
                  className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted hover:text-text-main"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Clear Filters Button - Always visible for easy access */}
            <Button
              variant="outline"
              className="h-9 px-3 text-xs"
              onClick={handleClearFilters}
            >
              <svg className="w-3.5 h-3.5 mr-1.5 rtl:mr-0 rtl:ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t('clearFilters')}
            </Button>

            {/* Filters - Compact */}
            <LookupSelect
              lookupKey="department_number"
              value={filterDepartment}
              onChange={(value) => setFilterDepartment(value as string | null)}
              placeholder={t('filters.allDepartments')}
              allowEmpty={true}
              emptyLabel={t('filters.allDepartments')}
              className="w-[140px] h-9 text-sm"
            />

            <LookupSelect
              lookupKey="employment_status"
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as string | null)}
              placeholder={t('filters.allStatus')}
              allowEmpty={true}
              emptyLabel={t('filters.allStatus')}
              className="w-[120px] h-9 text-sm"
            />

            <LookupSelect
              lookupKey="country"
              value={filterCountry}
              onChange={(value) => setFilterCountry(value as string | null)}
              placeholder={t('filters.allCountries')}
              allowEmpty={true}
              emptyLabel={t('filters.allCountries')}
              className="w-[120px] h-9 text-sm"
            />

            <LookupSelect
              lookupKey="employment_type"
              value={filterEmploymentType}
              onChange={(value) => setFilterEmploymentType(value as string | null)}
              placeholder={t('filters.allTypes')}
              allowEmpty={true}
              emptyLabel={t('filters.allTypes')}
              className="w-[120px] h-9 text-sm"
            />

            <Select
              value={filterIsActive}
              onChange={(e) => setFilterIsActive(e.target.value)}
              className="w-[110px] h-9 text-sm"
            >
              <option value="all">{t('filters.all')}</option>
              <option value="active">{t('status.active')}</option>
              <option value="inactive">{t('status.inactive')}</option>
            </Select>

            {/* View Toggle */}
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "table"
                    ? "bg-primary text-white"
                    : "text-text-muted hover:bg-gray-100"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "card"
                    ? "bg-primary text-white"
                    : "text-text-muted hover:bg-gray-100"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
            </div>

            {/* Actions - Compact */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                className="h-9 px-3 text-xs"
                onClick={() => {
                  /* Export logic */
                }}
              >
                <svg className="w-3.5 h-3.5 mr-1.5 rtl:mr-0 rtl:ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {tCommon('export')}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">{t('messages.errorPrefix')}: {error}</p>
            <p className="text-xs text-red-500 mt-1">{t('messages.checkConsole')}</p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => {
                setError(null);
                fetchEmployees();
              }}
            >
              {t('actions.retry')}
            </Button>
          </div>
        )}

        {/* Main Content - Resizable Split View */}
        <div className="flex gap-0 h-[calc(100vh-220px)] relative" data-split-container dir={direction} style={{ zIndex: 0, maxWidth: '100%' }}>
          {/* Left Side - Employees List */}
          <div
            className="bg-white border-r rtl:border-r-0 rtl:border-l border-gray-200 overflow-hidden"
            style={{ width: `${listWidth}%`, minWidth: "250px", maxWidth: "50%" }}
          >
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <EmployeeListSkeleton viewMode={viewMode} />
                ) : filteredEmployees.length === 0 ? (
                    <EmptyState
                      title={hasActiveFilters ? t('noEmployeesFound') : t('noEmployees')}
                      description={
                        hasActiveFilters
                          ? t('noResultsDescription')
                          : t('noEmployeesDescription')
                      }
                      icon={
                        <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      }
                      action={
                        hasActiveFilters
                          ? { label: t('clearFilters'), onClick: handleClearFilters }
                          : { label: t('addEmployee'), onClick: () => setShowAddEmployeeDialog(true) }
                      }
                    />
                  ) : (
                    <EmployeeList
                      employees={filteredEmployees}
                      selectedEmployee={selectedEmployee}
                      viewMode={viewMode}
                      onSelectEmployee={(emp) => {
                        console.log('[EmployeesPage] Employee manually selected:', emp.id, emp.name);
                        setUserManuallySelected(true); // Mark that user manually selected
                        setSelectedEmployee(emp);
                        // Toggle multi-select
                        setSelectedEmployeeIds(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(emp.id)) {
                            newSet.delete(emp.id);
                          } else {
                            newSet.add(emp.id);
                          }
                          return newSet;
                        });
                      }}
                      selectedEmployeeIds={selectedEmployeeIds}
                      onSortChange={handleSortChange}
                      onSortedDataChange={handleSortedDataChange}
                    />
                  )}
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="border-t border-gray-200 p-3 bg-gray-50 flex items-center justify-between">
                    <div className="text-xs text-text-muted">
                      {t('messages.paginationShowing', {
                        from: (currentPage - 1) * pageSize + 1,
                        to: Math.min(currentPage * pageSize, totalEmployees),
                        total: totalEmployees
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        {tCommon('previous')}
                      </Button>
                      <span className="text-xs text-text-muted">
                        {t('messages.paginationPage', { current: currentPage, total: totalPages })}
                      </span>
                      <Button
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        {tCommon('next')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          {/* Resizable Splitter */}
          <div
            className={`w-1 bg-gray-200 hover:bg-primary cursor-col-resize transition-colors flex-shrink-0 select-none ${
              isResizing ? "bg-primary" : ""
            }`}
            onMouseDown={handleMouseDown}
            style={{ userSelect: "none" }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-0.5 h-12 bg-gray-400 rounded-full"></div>
            </div>
          </div>

          {/* Right Side - Employee Detail Panel */}
          <div
            className="flex-1 min-w-0 overflow-hidden"
            style={{ width: `${100 - listWidth}%` }}
          >
            {!selectedEmployee ? (
              <EmptyState
                title={t('selectEmployee')}
                description={t('selectEmployee')}
                icon={
                  <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
              />
            ) : loadingDetail ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <div className="animate-pulse space-y-4 w-full max-w-2xl">
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-6 bg-gray-200 rounded w-48"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmployeeDetail 
                employee={selectedEmployee} 
                employeeDetail={selectedEmployeeDetail}
                onSave={handleSave}
                onTerminate={handleTerminate}
              />
            )}
          </div>
        </div>

        {/* Add Employee Dialog */}
        <AddEmployeeDialog
          open={showAddEmployeeDialog}
          onOpenChange={setShowAddEmployeeDialog}
          onSuccess={async (employeeId: string) => {
            console.log('[EmployeesPage] Employee added successfully:', employeeId);
            
            // Close the dialog first
            setShowAddEmployeeDialog(false);
            
            // Reset to page 1 to ensure we fetch from the beginning
            if (currentPage !== 1) {
              setCurrentPage(1);
              // Wait for page state to update before fetching
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // Refresh employees list - this will fetch from page 1 with client_id filter
            // fetchEmployees now returns the mapped employees
            const fetchedEmployees = await fetchEmployees();
            
            // Fetch employee detail to get full info
            await fetchEmployeeDetail(employeeId);
            
            // Check if employee is in the fetched list
            const employeeInList = fetchedEmployees?.find(emp => emp.id === employeeId);
            
            if (employeeInList) {
              // Employee found in list, select it
              console.log('[EmployeesPage] New employee found in list, selecting:', employeeInList.id, employeeInList.name);
              setSelectedEmployee(employeeInList);
              setUserManuallySelected(true);
            } else {
              // Employee not in current page (might be on another page due to sorting)
              // Create a temporary employee object and add it to the beginning of the list
              console.log('[EmployeesPage] New employee not in current page, adding to beginning of list');
              
              // Create employee object - will be updated when detail loads
              const newEmployee: Employee = {
                id: employeeId,
                name: employeeId, // Will be updated when detail loads
                email: '',
                department: '',
                position: '',
                status: 'Active',
                country: 'N/A',
                employmentType: 'Full-time',
              };
              
              // Select the new employee
              setSelectedEmployee(newEmployee);
              setUserManuallySelected(true);
              
              // Add to beginning of current list
              setEmployees(prevEmployees => {
                // Avoid duplicates
                if (prevEmployees.find(emp => emp.id === employeeId)) {
                  return prevEmployees;
                }
                return [newEmployee, ...prevEmployees];
              });
            }
            
            setToastMessage(t('savedSuccess'));
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
          }}
        />
      </div>
    </PageShell>
  );
}
