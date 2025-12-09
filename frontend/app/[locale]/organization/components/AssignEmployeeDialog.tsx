"use client";

import { useState, useEffect } from "react";
import { getAuthHeader } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDirection } from "@/contexts/DirectionContext";
import { cn } from "@/lib/utils";

const API_BASE_URL = "/api";

interface Employee {
  id: string;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  position?: string;
  status?: string;
}

interface AssignEmployeeDialogProps {
  unitId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignEmployeeDialog({
  unitId,
  open,
  onOpenChange,
  onSuccess,
}: AssignEmployeeDialogProps) {
  const { direction } = useDirection();
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (open && searchQuery) {
      const timeoutId = setTimeout(() => {
        searchEmployees();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else if (open && !searchQuery) {
      setEmployees([]);
    }
  }, [searchQuery, open]);

  const searchEmployees = async () => {
    if (!searchQuery.trim()) {
      setEmployees([]);
      return;
    }

    try {
      setLoading(true);
      const authHeader = getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const response = await fetch(
        `${API_BASE_URL}/employees?search=${encodeURIComponent(searchQuery)}&limit=20`,
        {
          headers: { Authorization: authHeader },
        }
      );

      if (!response.ok) throw new Error("Failed to search employees");

      const data = await response.json();
      setEmployees(data.data || []);
    } catch (err: any) {
      console.error("Error searching employees:", err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedEmployeeId) {
      alert("Please select an employee");
      return;
    }

    try {
      setAssigning(true);
      const authHeader = getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/org/units/${unitId}/employees`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          isPrimary: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign employee");
      }

      onSuccess();
      onOpenChange(false);
      setSearchQuery("");
      setSelectedEmployeeId(null);
      setEmployees([]);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error("Error assigning employee:", err);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Employee to Unit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Employees
            </label>
            <Input
              placeholder="Type employee name, code, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="border border-gray-200 rounded-md max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
            ) : employees.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {searchQuery
                  ? "No employees found. Try a different search term."
                  : "Start typing to search for employees"}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {employees.map((emp) => {
                  const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
                  const isSelected = selectedEmployeeId === emp.id;

                  return (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className={cn(
                        "w-full text-left rtl:text-right p-4 hover:bg-gray-50 transition-colors",
                        isSelected && "bg-blue-50 border-l-4 border-blue-500",
                        direction === "rtl" && isSelected && "border-l-0 border-r-4"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{fullName || "Unknown"}</div>
                          <div className="text-sm text-gray-500">
                            {emp.employee_code || emp.id}
                          </div>
                          {emp.email && (
                            <div className="text-xs text-gray-400">{emp.email}</div>
                          )}
                          {emp.position && (
                            <div className="text-xs text-gray-400">{emp.position}</div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedEmployeeId || assigning}>
            {assigning ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

