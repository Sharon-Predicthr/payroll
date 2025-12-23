"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface GridColumn<T = any> {
  id: string;
  label: string;
  accessor?: (row: T) => any;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  resizable?: boolean;
  minWidth?: number;
  defaultWidth?: number;
  defaultVisible?: boolean;
}

export interface GridConfig {
  columnOrder: string[];
  columnWidths: Record<string, number>;
  columnVisibility: Record<string, boolean>;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
}

export interface DataGridProps<T = any> {
  data: T[];
  columns: GridColumn<T>[];
  gridId: string; // Unique ID for this grid (for localStorage)
  onRowClick?: (row: T) => void;
  selectedRowId?: string | null;
  getRowId?: (row: T) => string;
  className?: string;
  emptyMessage?: string;
  disableInternalSorting?: boolean; // If true, data is already sorted by parent
  onSortChange?: (sortColumn: string | null, sortDirection: 'asc' | 'desc') => void; // Callback when sort changes
  onSortedDataChange?: (sortedData: T[]) => void; // Callback when sorted data changes
}

const DEFAULT_COLUMN_WIDTH = 150;
const MIN_COLUMN_WIDTH = 80;

export function DataGrid<T = any>({
  data,
  columns,
  gridId,
  onRowClick,
  selectedRowId,
  getRowId = (row: any) => row.id,
  className,
  emptyMessage = "אין נתונים להצגה",
  disableInternalSorting = false,
  onSortChange,
  onSortedDataChange,
}: DataGridProps<T>) {
  const storageKey = `grid_config_${gridId}`;

  // Load saved configuration from localStorage
  const loadConfig = useCallback((): GridConfig => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn(`Failed to load grid config for ${gridId}:`, e);
    }

    // Default configuration
    const defaultConfig: GridConfig = {
      columnOrder: columns.map((col) => col.id),
      columnWidths: columns.reduce((acc, col) => {
        acc[col.id] = col.defaultWidth || DEFAULT_COLUMN_WIDTH;
        return acc;
      }, {} as Record<string, number>),
      columnVisibility: columns.reduce((acc, col) => {
        acc[col.id] = col.defaultVisible !== false;
        return acc;
      }, {} as Record<string, boolean>),
      sortColumn: null,
      sortDirection: "asc",
    };

    return defaultConfig;
  }, [storageKey, columns]);

  const [config, setConfig] = useState<GridConfig>(loadConfig);

  // Notify parent of initial sort configuration on mount
  useEffect(() => {
    const initialConfig = loadConfig();
    if (onSortChange && initialConfig.sortColumn) {
      onSortChange(initialConfig.sortColumn, initialConfig.sortDirection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Save configuration to localStorage
  const saveConfig = useCallback(
    (newConfig: GridConfig) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newConfig));
        setConfig(newConfig);
      } catch (e) {
        console.warn(`Failed to save grid config for ${gridId}:`, e);
      }
    },
    [storageKey, gridId]
  );

  // Reset to default configuration
  const resetConfig = useCallback(() => {
    const defaultConfig = loadConfig();
    // Recalculate defaults
    const freshConfig: GridConfig = {
      columnOrder: columns.map((col) => col.id),
      columnWidths: columns.reduce((acc, col) => {
        acc[col.id] = col.defaultWidth || DEFAULT_COLUMN_WIDTH;
        return acc;
      }, {} as Record<string, number>),
      columnVisibility: columns.reduce((acc, col) => {
        acc[col.id] = col.defaultVisible !== false;
        return acc;
      }, {} as Record<string, boolean>),
      sortColumn: null,
      sortDirection: "asc",
    };
    saveConfig(freshConfig);
  }, [columns, loadConfig, saveConfig]);

  // Get visible columns in order
  const visibleColumns = useMemo(() => {
    return config.columnOrder
      .map((colId) => columns.find((col) => col.id === colId))
      .filter((col): col is GridColumn<T> => {
        return col !== undefined && config.columnVisibility[col.id] !== false;
      });
  }, [columns, config.columnOrder, config.columnVisibility]);

  // Handle column resize
  const handleResizeStart = useCallback(
    (columnId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingColumn(columnId);

      const startX = e.pageX;
      const startWidth = config.columnWidths[columnId] || DEFAULT_COLUMN_WIDTH;
      const currentDirection = typeof window !== "undefined" ? (document.documentElement.dir || "rtl") : "rtl";

      const handleMouseMove = (e: MouseEvent) => {
        const diff = currentDirection === "rtl" ? startX - e.pageX : e.pageX - startX;
        const newWidth = Math.max(
          MIN_COLUMN_WIDTH,
          startWidth + diff
        );

        saveConfig({
          ...config,
          columnWidths: {
            ...config.columnWidths,
            [columnId]: newWidth,
          },
        });
      };

      const handleMouseUp = () => {
        setResizingColumn(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [config, saveConfig]
  );

  // Handle column drag start
  const handleDragStart = useCallback((columnId: string) => {
    setDraggedColumn(columnId);
  }, []);

  // Handle column drop
  const handleDrop = useCallback(
    (targetColumnId: string) => {
      if (!draggedColumn || draggedColumn === targetColumnId) {
        setDraggedColumn(null);
        return;
      }

      const newOrder = [...config.columnOrder];
      const draggedIndex = newOrder.indexOf(draggedColumn);
      const targetIndex = newOrder.indexOf(targetColumnId);

      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedColumn);

      saveConfig({
        ...config,
        columnOrder: newOrder,
      });

      setDraggedColumn(null);
    },
    [draggedColumn, config, saveConfig]
  );

  // Handle sort
  const handleSort = useCallback(
    (columnId: string) => {
      const column = columns.find((col) => col.id === columnId);
      if (!column || column.sortable === false) return;

      const newSortColumn = columnId;
      const newSortDirection =
        config.sortColumn === columnId && config.sortDirection === "asc"
          ? "desc"
          : "asc";

      saveConfig({
        ...config,
        sortColumn: newSortColumn,
        sortDirection: newSortDirection,
      });

      // Notify parent of sort change
      if (onSortChange) {
        onSortChange(newSortColumn, newSortDirection);
      }
    },
    [columns, config, saveConfig, onSortChange]
  );

  // Toggle column visibility
  const toggleColumnVisibility = useCallback(
    (columnId: string) => {
      saveConfig({
        ...config,
        columnVisibility: {
          ...config.columnVisibility,
          [columnId]: !config.columnVisibility[columnId],
        },
      });
    },
    [config, saveConfig]
  );

  // Sort data (skip if disableInternalSorting is true)
  const sortedData = useMemo(() => {
    // If internal sorting is disabled, return data as-is (already sorted by parent)
    if (disableInternalSorting) {
      return data;
    }

    if (!config.sortColumn) return data;

    const column = columns.find((col) => col.id === config.sortColumn);
    if (!column) return data;

    const sorted = [...data].sort((a, b) => {
      const aValue = column.accessor ? column.accessor(a) : (a as any)[config.sortColumn!];
      const bValue = column.accessor ? column.accessor(b) : (b as any)[config.sortColumn!];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return config.sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [data, config.sortColumn, config.sortDirection, columns, disableInternalSorting]);

  // Notify parent of sorted data changes (only when data actually changes)
  const prevSortedDataRef = useRef<T[]>([]);
  useEffect(() => {
    // Only call onSortedDataChange if the data actually changed (by reference or content)
    const dataChanged = prevSortedDataRef.current.length !== sortedData.length ||
      prevSortedDataRef.current.some((item, index) => item !== sortedData[index]);
    
    if (dataChanged && onSortedDataChange) {
      prevSortedDataRef.current = sortedData;
      onSortedDataChange(sortedData);
    } else {
      prevSortedDataRef.current = sortedData;
    }
  }, [sortedData, onSortedDataChange]);

  const direction = typeof window !== "undefined" ? (document.documentElement.dir || "rtl") : "rtl";

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    };

    if (showColumnMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColumnMenu]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Grid Controls */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="text-xs h-8 px-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              עמודות
            </Button>
            
            {/* Column Visibility Menu */}
            {showColumnMenu && (
              <div
                ref={menuRef}
                className="absolute top-10 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px]"
                style={{ direction: "rtl" }}
              >
                <div className="text-xs font-semibold mb-2 px-2">הצג/הסתר עמודות</div>
                {columns.map((column) => (
                  <label
                    key={column.id}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={config.columnVisibility[column.id] !== false}
                      onChange={() => toggleColumnVisibility(column.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{column.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            onClick={resetConfig}
            className="text-xs h-8 px-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            איפוס
          </Button>
        </div>
      </div>


      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table
          ref={tableRef}
          className="w-full border-collapse bg-white"
          style={{ direction: "rtl" }}
        >
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {visibleColumns.map((column) => {
                const isSorting = config.sortColumn === column.id;
                const isResizing = resizingColumn === column.id;
                const width = config.columnWidths[column.id] || DEFAULT_COLUMN_WIDTH;

                return (
                  <th
                    key={column.id}
                    draggable
                    onDragStart={() => handleDragStart(column.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("bg-blue-50");
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove("bg-blue-50");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("bg-blue-50");
                      handleDrop(column.id);
                    }}
                    className={cn(
                      "relative select-none border-r border-gray-200",
                      column.sortable !== false && "cursor-pointer hover:bg-gray-100",
                      isResizing && "cursor-col-resize"
                    )}
                    style={{ width: `${width}px`, minWidth: `${width}px` }}
                  >
                    <div className="flex items-center justify-between px-3 py-2">
                      <span
                        onClick={() => column.sortable !== false && handleSort(column.id)}
                        className="flex-1"
                      >
                        {column.label}
                      </span>
                      {column.sortable !== false && (
                        <span
                          onClick={() => handleSort(column.id)}
                          className="ml-2"
                        >
                          {isSorting ? (
                            config.sortDirection === "asc" ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                              </svg>
                            )
                          ) : (
                            <svg className="w-4 h-4 opacity-30" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                    {column.resizable !== false && (
                      <div
                        className={cn(
                          "absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500",
                          direction === "rtl" ? "left-0" : "right-0",
                          isResizing && "bg-blue-500"
                        )}
                        onMouseDown={(e) => handleResizeStart(column.id, e)}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIndex) => {
              const rowId = getRowId(row);
              const isSelected = selectedRowId === rowId;

              return (
                <tr
                  key={rowId}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-gray-100 hover:bg-gray-50 transition-colors",
                    isSelected && "bg-blue-50",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {visibleColumns.map((column) => {
                    const value = column.accessor
                      ? column.accessor(row)
                      : (row as any)[column.id];
                    const width = config.columnWidths[column.id] || DEFAULT_COLUMN_WIDTH;

                    return (
                      <td
                        key={column.id}
                        className="px-3 py-2 border-r border-gray-100"
                        style={{ width: `${width}px`, minWidth: `${width}px` }}
                      >
                        {column.render ? column.render(value, row) : String(value || "")}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

