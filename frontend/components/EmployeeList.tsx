"use client";

import { useDirection } from "@/contexts/DirectionContext";
import { useTranslations } from 'next-intl';
import { DataGrid, GridColumn } from "@/components/DataGrid";

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

interface EmployeeListProps {
  employees: Employee[];
  selectedEmployee: Employee | null;
  viewMode: "table" | "card";
  onSelectEmployee: (employee: Employee) => void;
  selectedEmployeeIds?: Set<string>;
  onSortChange?: (sortColumn: string | null, sortDirection: 'asc' | 'desc') => void;
  onSortedDataChange?: (sortedData: Employee[]) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700";
    case "Inactive":
      return "bg-gray-100 text-gray-700";
    case "On Leave":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function EmployeeList({
  employees,
  selectedEmployee,
  viewMode,
  onSelectEmployee,
  selectedEmployeeIds,
  onSortChange,
  onSortedDataChange,
}: EmployeeListProps) {
  const { direction } = useDirection();
  const t = useTranslations('employees');
  const tCommon = useTranslations('common');

  // Define columns for DataGrid
  const columns: GridColumn<Employee>[] = [
    {
      id: "name",
      label: t('name'),
      defaultWidth: 250,
      sortable: true,
      resizable: true,
      accessor: (row) => row.name,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
            {getInitials(row.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-text-main truncate">{row.name}</div>
            <div className="text-xs text-text-muted truncate">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      id: "id",
      label: t('id'),
      defaultWidth: 120,
      sortable: true,
      resizable: true,
      accessor: (row) => row.id,
      render: (value) => (
        <span className="text-xs text-text-muted">{value}</span>
      ),
    },
    {
      id: "department",
      label: t('department'),
      defaultWidth: 150,
      sortable: true,
      resizable: true,
      accessor: (row) => row.department,
      render: (value) => (
        <span className="text-xs text-text-muted truncate">{value}</span>
      ),
    },
    {
      id: "position",
      label: t('position'),
      defaultWidth: 150,
      sortable: true,
      resizable: true,
      accessor: (row) => row.position,
      render: (value) => (
        <span className="text-xs text-text-muted truncate">{value}</span>
      ),
    },
    {
      id: "status",
      label: tCommon('status'),
      defaultWidth: 120,
      sortable: true,
      resizable: true,
      accessor: (row) => row.status,
      render: (value) => (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(value)}`}>
          {value}
        </span>
      ),
    },
    {
      id: "employmentType",
      label: t('employmentType'),
      defaultWidth: 120,
      sortable: true,
      resizable: true,
      defaultVisible: false,
      accessor: (row) => row.employmentType,
      render: (value) => (
        <span className="text-xs text-text-muted">{value}</span>
      ),
    },
    {
      id: "country",
      label: t('country'),
      defaultWidth: 120,
      sortable: true,
      resizable: true,
      defaultVisible: false,
      accessor: (row) => row.country,
      render: (value) => (
        <span className="text-xs text-text-muted">{value}</span>
      ),
    },
  ];

  if (viewMode === "table") {
    return (
      <div className="w-full bg-white h-full">
        <DataGrid
          data={employees}
          columns={columns}
          gridId="employees"
          onRowClick={onSelectEmployee}
          selectedRowId={selectedEmployee?.id || null}
          emptyMessage={t('noEmployees')}
          onSortChange={onSortChange}
          onSortedDataChange={onSortedDataChange}
        />
      </div>
    );
  }

  // Card view (keep existing implementation)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {employees.map((employee) => (
        <div
          key={employee.id}
          onClick={() => onSelectEmployee(employee)}
          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
            selectedEmployee?.id === employee.id
              ? "border-primary bg-primary/5"
              : "border-gray-200 hover:border-primary hover:bg-gray-50"
          } ${selectedEmployeeIds?.has(employee.id) ? "ring-2 ring-primary" : ""}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
              {getInitials(employee.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-text-main truncate">{employee.name}</h3>
              <p className="text-sm text-text-muted truncate">{employee.email}</p>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">{t('department')}:</span>
              <span className="text-text-main">{employee.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">{t('position')}:</span>
              <span className="text-text-main">{employee.position}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">{tCommon('status')}:</span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(employee.status)}`}>
                {employee.status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
