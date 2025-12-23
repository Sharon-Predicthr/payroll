"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { CreatePayslipsDialog } from "./components/CreatePayslipsDialog";

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
  const [showCreatePayslipsDialog, setShowCreatePayslipsDialog] = useState(false);
  const [userManuallySelected, setUserManuallySelected] = useState(false); // Track if user manually selected an employee
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Fetch employees on mount and when pagination changes
  useEffect(() => {
    const token = localStorage.getItem('paylens_access_token');
    console.log('[Frontend] useEffect - Token check:', !!token);
    
    if (!isAuthenticated() || !token) {
      console.log('[Frontend] Not authenticated, redirecting to login');
      router.push(`/${locale}/login`);
      return;
    }

    console.log('[Frontend] Authenticated, fetching employees');
    fetchEmployees();
  }, [router, currentPage, pageSize]);

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

  const fetchEmployees = async () => {
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
      
      const url = `/api/employees?page=${currentPage}&limit=${pageSize}`;
      console.log('[EmployeesPage] Making request to:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store', // Force fresh fetch
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
        return;
      }
      
      if (!employeesData || !Array.isArray(employeesData)) {
        console.warn('[EmployeesPage] No employees array in response');
        setError('No employees data received');
        setEmployees([]);
        return;
      }
      
      console.log('[EmployeesPage] Received', employeesData.length, 'employees');
      const mappedEmployees = employeesData.map(mapBackendToFrontend);
      console.log('[EmployeesPage] Mapped employees:', mappedEmployees.length);
      
      setEmployees(mappedEmployees);
      
      // Update pagination info
      if (paginationData) {
        setTotalEmployees(paginationData.total || mappedEmployees.length);
        setTotalPages(paginationData.totalPages || 1);
      } else {
        // If no pagination info, assume all data is loaded
        setTotalEmployees(mappedEmployees.length);
        setTotalPages(1);
      }
      
      
      console.log('[EmployeesPage] ✅ Fetch completed successfully');
    } catch (err: any) {
      console.error('[EmployeesPage] ❌ Error fetching employees:', err);
      console.error('[EmployeesPage] Error stack:', err.stack);
      setError(err.message || 'Failed to load employees. Please check console for details.');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

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
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterEmploymentType, setFilterEmploymentType] = useState("all");
  
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
    return employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesDepartment = filterDepartment === "all" || emp.department === filterDepartment;
      const matchesStatus = filterStatus === "all" || emp.status === filterStatus;
      const matchesCountry = filterCountry === "all" || emp.country === filterCountry;
      const matchesEmploymentType =
        filterEmploymentType === "all" || emp.employmentType === filterEmploymentType;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesStatus &&
        matchesCountry &&
        matchesEmploymentType
      );
    });
  }, [employees, debouncedSearchQuery, filterDepartment, filterStatus, filterCountry, filterEmploymentType]);

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

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
  const countries = Array.from(new Set(employees.map((e) => e.country).filter(Boolean)));

  // Check if any filters are active
  const hasActiveFilters = 
    debouncedSearchQuery !== "" ||
    filterDepartment !== "all" ||
    filterStatus !== "all" ||
    filterCountry !== "all" ||
    filterEmploymentType !== "all";

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setFilterDepartment("all");
    setFilterStatus("all");
    setFilterCountry("all");
    setFilterEmploymentType("all");
    // Sorting is handled by DataGrid internally
  };

  const handleSave = () => {
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
                onClick={() => setShowCreatePayslipsDialog(true)}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                צור תלושי שכר
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => {
                /* Add employee logic */
              }}
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

            {/* Clear Filters Button */}
            {hasActiveFilters && (
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
            )}

            {/* Filters - Compact */}
            <Select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-[120px] h-9 text-sm"
            >
              <option value="all">{t('filters.allDepartments')}</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </Select>

            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-[110px] h-9 text-sm"
            >
              <option value="all">{t('filters.allStatus')}</option>
              <option value="Active">{t('status.active')}</option>
              <option value="Inactive">{t('status.inactive')}</option>
              <option value="On Leave">{t('status.onLeave')}</option>
            </Select>

            <Select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="w-[120px] h-9 text-sm"
            >
              <option value="all">{t('filters.allCountries')}</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </Select>

            <Select
              value={filterEmploymentType}
              onChange={(e) => setFilterEmploymentType(e.target.value)}
              className="w-[110px] h-9 text-sm"
            >
              <option value="all">{t('filters.allTypes')}</option>
              <option value="Full-time">{t('employmentTypes.fullTime')}</option>
              <option value="Part-time">{t('employmentTypes.partTime')}</option>
              <option value="Contract">{t('employmentTypes.contract')}</option>
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
                          : { label: t('addEmployee'), onClick: () => {/* Add employee logic */} }
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

        {/* Create Payslips Dialog */}
        <CreatePayslipsDialog
          open={showCreatePayslipsDialog}
          onOpenChange={setShowCreatePayslipsDialog}
          selectedEmployees={employees.filter(emp => selectedEmployeeIds.has(emp.id))}
          allEmployees={employees}
          onSuccess={() => {
            setShowCreatePayslipsDialog(false);
            setSelectedEmployeeIds(new Set());
          }}
        />
      </div>
    </PageShell>
  );
}
