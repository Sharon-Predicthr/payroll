"use client";

import { useState, useEffect } from "react";
import { getAuthHeader } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useDirection } from "@/contexts/DirectionContext";
import { cn } from "@/lib/utils";

const API_BASE_URL = "/api";

interface Employee {
  employee_id: string;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  position?: string;
  status?: string;
  is_primary: boolean;
  valid_from: string;
  valid_to: string | null;
}

interface EmployeeTableProps {
  unitId: number;
  onRefresh?: () => void;
}

export function EmployeeTable({ unitId, onRefresh }: EmployeeTableProps) {
  const { direction } = useDirection();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const authHeader = getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/org/units/${unitId}/employees`, {
        headers: { Authorization: authHeader },
      });

      if (!response.ok) throw new Error("Failed to fetch employees");

      const data = await response.json();
      setEmployees(data.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unitId) {
      fetchEmployees();
    }
  }, [unitId]);

  const handleRemove = async (employeeId: string) => {
    if (!confirm("Are you sure you want to remove this employee from this unit?")) {
      return;
    }

    try {
      const authHeader = getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/org/units/${unitId}/employees/${employeeId}`, {
        method: "DELETE",
        headers: { Authorization: authHeader },
      });

      if (!response.ok) throw new Error("Failed to remove employee");

      await fetchEmployees();
      onRefresh?.();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error("Error removing employee:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">Loading employees...</div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-red-500">Error: {error}</div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        No employees assigned to this unit.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className={cn("text-left py-3 px-4 text-sm font-semibold text-gray-700", direction === "rtl" && "text-right")}>
              Name
            </th>
            <th className={cn("text-left py-3 px-4 text-sm font-semibold text-gray-700", direction === "rtl" && "text-right")}>
              ID
            </th>
            <th className={cn("text-left py-3 px-4 text-sm font-semibold text-gray-700", direction === "rtl" && "text-right")}>
              Position
            </th>
            <th className={cn("text-left py-3 px-4 text-sm font-semibold text-gray-700", direction === "rtl" && "text-right")}>
              Status
            </th>
            <th className={cn("text-left py-3 px-4 text-sm font-semibold text-gray-700", direction === "rtl" && "text-right")}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.employee_id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 text-sm">
                <div>
                  <div className="font-medium text-gray-900">
                    {emp.first_name} {emp.last_name}
                  </div>
                  {emp.email && (
                    <div className="text-xs text-gray-500">{emp.email}</div>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {emp.employee_code || emp.employee_id}
              </td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {emp.position || "-"}
              </td>
              <td className="py-3 px-4 text-sm">
                <span
                  className={cn(
                    "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                    emp.status === "Active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  )}
                >
                  {emp.status || "Active"}
                </span>
              </td>
              <td className="py-3 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(emp.employee_id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

