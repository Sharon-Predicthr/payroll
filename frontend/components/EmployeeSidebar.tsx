"use client";

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

interface EmployeeSidebarProps {
  employee: Employee | null;
}

export function EmployeeSidebar({ employee }: EmployeeSidebarProps) {
  if (!employee) {
    return (
      <div className="w-64 bg-white border-l border-r border-gray-200 overflow-y-auto h-full flex items-center justify-center">
        <p className="text-sm text-text-muted text-center px-4">Select an employee to view quick info</p>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-l border-r border-gray-200 overflow-y-auto h-full">
      <div className="p-4 space-y-4">
        {/* Quick Info Header */}
        <div className="border-b border-gray-200 pb-3">
          <h3 className="text-sm font-semibold text-text-main mb-2">Quick Info</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-text-muted">Employee ID</p>
              <p className="text-sm font-medium text-text-main">{employee.id}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Email</p>
              <p className="text-sm font-medium text-text-main truncate">{employee.email}</p>
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Employment</h4>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-text-muted">Department</p>
              <p className="text-sm text-text-main">{employee.department}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Position</p>
              <p className="text-sm text-text-main">{employee.position}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Type</p>
              <p className="text-sm text-text-main">{employee.employmentType}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Country</p>
              <p className="text-sm text-text-main">{employee.country}</p>
            </div>
          </div>
        </div>

        {/* Status & Tags */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Status</h4>
          <div>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                employee.status === "Active"
                  ? "bg-green-100 text-green-700"
                  : employee.status === "Inactive"
                  ? "bg-gray-100 text-gray-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {employee.status}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-3 pt-3 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Quick Stats</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-muted">Hire Date</p>
              <p className="text-sm font-semibold text-text-main">Jan 2020</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-muted">Tenure</p>
              <p className="text-sm font-semibold text-text-main">4 years</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-muted">Salary</p>
              <p className="text-sm font-semibold text-text-main">$75k</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-muted">Leave Days</p>
              <p className="text-sm font-semibold text-text-main">12 left</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3 pt-3 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Recent Activity</h4>
          <div className="space-y-2">
            <div className="text-xs">
              <p className="text-text-main">Last payroll processed</p>
              <p className="text-text-muted">March 1, 2024</p>
            </div>
            <div className="text-xs">
              <p className="text-text-main">Last updated</p>
              <p className="text-text-muted">2 days ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

