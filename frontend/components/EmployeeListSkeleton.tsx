"use client";

export function EmployeeListSkeleton({ viewMode }: { viewMode: "table" | "card" }) {
  if (viewMode === "table") {
    return (
      <div className="w-full bg-white overflow-y-auto h-full">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                Name
              </th>
              <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                ID
              </th>
              <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                Department
              </th>
              <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                Position
              </th>
              <th className="px-3 py-2 text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </td>
                <td className="px-3 py-2">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="px-3 py-2">
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </td>
                <td className="px-3 py-2">
                  <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Card view skeleton
  return (
    <div className="w-full bg-white overflow-y-auto h-full p-2 space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="p-2.5 rounded-lg border border-gray-200 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="h-5 bg-gray-200 rounded-full w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

