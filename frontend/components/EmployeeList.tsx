"use client";

import { useState, useRef } from "react";
import { useDirection } from "@/contexts/DirectionContext";
import { useTranslations } from 'next-intl';

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
  sortColumn?: keyof Employee | null;
  sortDirection?: "asc" | "desc";
  onSort?: (column: keyof Employee) => void;
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
  sortColumn,
  sortDirection,
  onSort,
}: EmployeeListProps) {
  const { direction } = useDirection();
  const t = useTranslations('employees');
  const [columnWidths, setColumnWidths] = useState({
    name: 200,
    id: 100,
    department: 120,
    position: 150,
    status: 100,
  });
  const [resizing, setResizing] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleMouseDown = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(column);
    const startX = e.pageX;
    const startWidth = columnWidths[column as keyof typeof columnWidths];

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.pageX - startX;
      const newWidth = Math.max(80, startWidth + diff);
      setColumnWidths((prev) => ({
        ...prev,
        [column]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  if (viewMode === "table") {
    const totalWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
    
    return (
      <div className="w-full bg-white overflow-y-auto h-full overflow-x-auto">
        <table ref={tableRef} className="w-full" style={{ minWidth: totalWidth }}>
          <colgroup>
            <col style={{ width: columnWidths.name }} />
            <col style={{ width: columnWidths.id }} />
            <col style={{ width: columnWidths.department }} />
            <col style={{ width: columnWidths.position }} />
            <col style={{ width: columnWidths.status }} />
          </colgroup>
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th
                className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase relative select-none cursor-pointer hover:bg-gray-100 transition-colors"
                style={{ width: columnWidths.name }}
                onClick={() => onSort && onSort("name")}
              >
                <div className="flex items-center gap-1">
                  {t('name')}
                  {sortColumn === "name" && (
                    <svg className={`w-3 h-3 ${sortDirection === "asc" ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
                <div
                  className={`absolute right-0 rtl:right-auto rtl:left-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${
                    resizing === "name" ? "bg-primary" : "hover:bg-primary/50"
                  }`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown("name", e);
                  }}
                ></div>
              </th>
              <th
                className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase relative select-none cursor-pointer hover:bg-gray-100 transition-colors"
                style={{ width: columnWidths.id }}
                onClick={() => onSort && onSort("id")}
              >
                <div className="flex items-center gap-1">
                  {t('id')}
                  {sortColumn === "id" && (
                    <svg className={`w-3 h-3 ${sortDirection === "asc" ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
                <div
                  className={`absolute right-0 rtl:right-auto rtl:left-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${
                    resizing === "id" ? "bg-primary" : "hover:bg-primary/50"
                  }`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown("id", e);
                  }}
                ></div>
              </th>
              <th
                className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase relative select-none cursor-pointer hover:bg-gray-100 transition-colors"
                style={{ width: columnWidths.department }}
                onClick={() => onSort && onSort("department")}
              >
                <div className="flex items-center gap-1">
                  {t('department')}
                  {sortColumn === "department" && (
                    <svg className={`w-3 h-3 ${sortDirection === "asc" ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
                <div
                  className={`absolute right-0 rtl:right-auto rtl:left-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${
                    resizing === "department" ? "bg-primary" : "hover:bg-primary/50"
                  }`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown("department", e);
                  }}
                ></div>
              </th>
              <th
                className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase relative select-none cursor-pointer hover:bg-gray-100 transition-colors"
                style={{ width: columnWidths.position }}
                onClick={() => onSort && onSort("position")}
              >
                <div className="flex items-center gap-1">
                  {t('position')}
                  {sortColumn === "position" && (
                    <svg className={`w-3 h-3 ${sortDirection === "asc" ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
                <div
                  className={`absolute right-0 rtl:right-auto rtl:left-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${
                    resizing === "position" ? "bg-primary" : "hover:bg-primary/50"
                  }`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown("position", e);
                  }}
                ></div>
              </th>
              <th
                className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase select-none cursor-pointer hover:bg-gray-100 transition-colors"
                style={{ width: columnWidths.status }}
                onClick={() => onSort && onSort("status")}
              >
                <div className="flex items-center gap-1">
                  {t('status')}
                  {sortColumn === "status" && (
                    <svg className={`w-3 h-3 ${sortDirection === "asc" ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr
                key={employee.id}
                onClick={() => onSelectEmployee(employee)}
                className={`cursor-pointer transition-colors ${
                  selectedEmployee?.id === employee.id
                    ? "bg-primary/10 border-l-2 rtl:border-l-0 rtl:border-r-2 border-l-primary rtl:border-r-primary"
                    : "hover:bg-gray-50"
                }`}
              >
                <td className="px-3 py-2 whitespace-nowrap" style={{ width: columnWidths.name }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                      {getInitials(employee.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-text-main truncate">{employee.name}</div>
                      <div className="text-xs text-text-muted truncate">{employee.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-text-muted" style={{ width: columnWidths.id }}>
                  {employee.id}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-text-muted truncate" style={{ width: columnWidths.department }}>
                  {employee.department}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-text-muted truncate" style={{ width: columnWidths.position }}>
                  {employee.position}
                </td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ width: columnWidths.status }}>
                  <span
                    className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(
                      employee.status
                    )}`}
                  >
                    {employee.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Card view - Compact
  return (
    <div className="w-full bg-white overflow-y-auto h-full p-2 space-y-2">
      {employees.map((employee) => (
        <div
          key={employee.id}
          onClick={() => onSelectEmployee(employee)}
          className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
            selectedEmployee?.id === employee.id
              ? "border-primary bg-primary/10 border-l-4 rtl:border-l-0 rtl:border-r-4 border-l-primary rtl:border-r-primary"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {getInitials(employee.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-text-main truncate">{employee.name}</h3>
              <p className="text-xs text-text-muted truncate">{employee.position}</p>
              <p className="text-xs text-text-muted truncate">{employee.department}</p>
            </div>
            <span
              className={`px-1.5 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getStatusColor(employee.status)}`}
            >
              {employee.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

