"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface EditableTableColumn<T = any> {
  id: string;
  label: string;
  accessor?: (row: T, index: number) => any;
  render?: (value: any, row: T, index: number, isEditing: boolean) => React.ReactNode;
  editor?: (value: any, row: T, onChange: (value: any) => void) => React.ReactNode;
  width?: string;
  sortable?: boolean;
}

export interface EditableTableProps<T = any> {
  columns: EditableTableColumn<T>[];
  data: T[];
  onAdd?: () => T | Promise<T>; // Returns new row template
  onUpdate?: (row: T, index: number) => void | Promise<void>;
  onDelete?: (row: T, index: number) => void | Promise<void>;
  onSave?: (rows: T[]) => void | Promise<void>;
  getRowId?: (row: T, index: number) => string | number;
  emptyMessage?: string;
  addButtonLabel?: string;
  className?: string;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function EditableTable<T extends Record<string, any> = any>({
  columns,
  data: initialData,
  onAdd,
  onUpdate,
  onDelete,
  onSave,
  getRowId = (row, index) => row.id || `row-${index}`,
  emptyMessage = "אין נתונים",
  addButtonLabel = "הוסף שורה",
  className,
  canAdd = true,
  canEdit = true,
  canDelete = true,
}: EditableTableProps<T>) {
  const [data, setData] = useState<T[]>(initialData);
  const [editingRow, setEditingRow] = useState<string | number | null>(null);
  const [editedData, setEditedData] = useState<Partial<Record<string | number, T>>>({});
  
  // Debug logging
  useEffect(() => {
    console.log('[EditableTable] canAdd:', canAdd, 'canEdit:', canEdit, 'canDelete:', canDelete, 'data.length:', data.length, 'willShowActions:', (canEdit || canDelete));
  }, [canAdd, canEdit, canDelete, data.length]);

  // Update local data when initialData changes
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleAdd = useCallback(async () => {
    console.log('=== [EditableTable] handleAdd CALLED ===');
    if (!onAdd) {
      console.error('[EditableTable] handleAdd - onAdd is not defined!');
      return;
    }

    try {
      console.log('[EditableTable] handleAdd - Calling onAdd...');
      const newRow = await onAdd();
      console.log('[EditableTable] handleAdd - onAdd returned:', newRow);
      console.log('[EditableTable] handleAdd - newRow.effective_to:', newRow?.effective_to);
      
      let newRowIndex = 0;
      
      // Use functional update to get the latest data and call onSave
      if (onSave) {
        setData((prev) => {
          const newData = [...prev, newRow];
          newRowIndex = newData.length - 1;
          // Call onSave with updated data after adding (async, but we don't await it here)
          Promise.resolve(onSave(newData)).catch(err => console.error('Error in onSave:', err));
          return newData;
        });
      } else {
        setData((prev) => {
          const newData = [...prev, newRow];
          newRowIndex = newData.length - 1;
          return newData;
        });
      }
      
      // Auto-edit the new row
      const newRowId = getRowId(newRow, newRowIndex);
      console.log('[EditableTable] handleAdd - newRowId:', newRowId);
      console.log('[EditableTable] handleAdd - Setting editingRow to:', newRowId);
      setEditingRow(newRowId);
      
      // Store the new row in editedData - this is what the editor will use
      setEditedData((prev) => {
        const updated = {
          ...prev,
          [newRowId]: { ...newRow },
        };
        console.log('[EditableTable] handleAdd - updated editedData:', updated);
        console.log('[EditableTable] handleAdd - updated[newRowId]:', updated[newRowId]);
        console.log('[EditableTable] handleAdd - updated[newRowId].effective_to:', updated[newRowId]?.effective_to);
        return updated;
      });
      console.log('=== [EditableTable] handleAdd COMPLETED ===');
    } catch (error) {
      console.error("[EditableTable] handleAdd - Error adding row:", error);
    }
  }, [onAdd, getRowId, onSave]);

  const handleEdit = useCallback((row: T, index: number) => {
    if (!canEdit) return;
    
    const rowId = getRowId(row, index);
    setEditingRow(rowId);
    setEditedData((prev) => ({
      ...prev,
      [rowId]: { ...row },
    }));
  }, [canEdit, getRowId]);

  const handleSave = useCallback(async (row: T, index: number) => {
    const rowId = getRowId(row, index);
    const edited = editedData[rowId];

    if (edited) {
      const updatedRow = { ...row, ...edited };
      
      // Update data and call onSave with the updated data
      if (onSave) {
        setData((prev) => {
          const updatedData = [...prev];
          updatedData[index] = updatedRow;
          // Call onSave with updated data (async, but we don't await it here)
          Promise.resolve(onSave(updatedData)).catch(err => console.error('Error in onSave:', err));
          return updatedData;
        });
      } else {
        setData((prev) => {
          const updatedData = [...prev];
          updatedData[index] = updatedRow;
          return updatedData;
        });
      }

      if (onUpdate) {
        await onUpdate(updatedRow, index);
      }
    }

    setEditingRow(null);
    setEditedData((prev) => {
      const newData = { ...prev };
      delete newData[rowId];
      return newData;
    });
  }, [editedData, onUpdate, onSave, getRowId]);

  const handleCancel = useCallback((row: T, index: number) => {
    const rowId = getRowId(row, index);
    setEditingRow(null);
    setEditedData((prev) => {
      const newData = { ...prev };
      delete newData[rowId];
      return newData;
    });
  }, [getRowId]);

  const handleDelete = useCallback(async (row: T, index: number) => {
    if (!canDelete || !confirm("האם אתה בטוח שברצונך למחוק שורה זו?")) {
      return;
    }

    if (onDelete) {
      await onDelete(row, index);
    }

    // Update data and call onSave with the updated data after deletion
    if (onSave) {
      setData((prev) => {
        const newData = prev.filter((_, i) => i !== index);
        // Call onSave with updated data (async, but we don't await it here)
        Promise.resolve(onSave(newData)).catch(err => console.error('Error in onSave:', err));
        return newData;
      });
    } else {
      setData((prev) => prev.filter((_, i) => i !== index));
    }
  }, [canDelete, onDelete, onSave]);

  const handleFieldChange = useCallback((rowId: string | number, field: string, value: any) => {
    setEditedData((prev) => {
      const currentRow = prev[rowId] || {} as T;
      return {
        ...prev,
        [rowId]: {
          ...currentRow,
          [field]: value,
        } as T,
      };
    });
  }, []);

  if (data.length === 0 && !canAdd) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500 border border-gray-200 rounded-lg">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {canAdd && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={handleAdd}
            className="h-8 px-3 text-xs"
          >
            <svg className="w-4 h-4 mr-1.5 rtl:mr-0 rtl:ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {addButtonLabel}
          </Button>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full min-w-full" style={{ direction: "rtl" }}>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap"
                  style={{ width: column.width }}
                >
                  {column.label}
                </th>
              ))}
              {(canEdit || canDelete) && (
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase w-24 whitespace-nowrap sticky right-0 bg-gray-50 z-10" key="actions-header">
                  פעולות
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (canEdit || canDelete ? 1 : 0)} className="px-3 py-8 text-center text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const rowId = getRowId(row, index);
                const isEditing = editingRow === rowId;
                // For new rows (id is null), use editedData if it exists, otherwise use row
                // For existing rows, use editedData if it exists, otherwise use row
                const edited = editedData[rowId] || row;
                const displayRow = isEditing ? edited : row;
                // For editor, always pass the original row (not edited) so it can access original values
                const originalRow = row;

                return (
                  <tr key={rowId} className="hover:bg-gray-50">
                    {columns.map((column) => {
                      // For editing rows, prefer editedData value, then row value, then displayRow value
                      let value;
                      let rowForEditor = displayRow; // Use displayRow as default
                      
                      if (isEditing && editedData[rowId]) {
                        // For editing rows, ALWAYS use editedData[rowId] - it contains the latest values
                        // Use hasOwnProperty to include null values (null is a valid value)
                        if (editedData[rowId].hasOwnProperty(column.id)) {
                          value = editedData[rowId][column.id];
                        } else if (originalRow.hasOwnProperty(column.id)) {
                          value = originalRow[column.id];
                        } else {
                          value = displayRow[column.id];
                        }
                        // For new rows (id is null), pass editedData[rowId] to editor
                        // For existing rows, also pass editedData[rowId] so editor has access to all values
                        rowForEditor = editedData[rowId];
                        
                        // Debug log for effective_to column
                        if (column.id === 'effective_to') {
                          console.log('[EditableTable] effective_to - rowId:', rowId);
                          console.log('[EditableTable] effective_to - editedData[rowId].effective_to:', editedData[rowId]?.effective_to);
                          console.log('[EditableTable] effective_to - value:', value);
                        }
                      } else {
                        // For non-editing rows, use displayRow
                        value = column.accessor
                          ? column.accessor(displayRow, index)
                          : displayRow[column.id];
                      }

                      return (
                        <td key={column.id} className="px-3 py-2 text-sm">
                          {isEditing && column.editor ? (
                            column.editor(value, rowForEditor, (newValue) =>
                              handleFieldChange(rowId, column.id, newValue)
                            )
                          ) : column.render ? (
                            column.render(value, displayRow, index, isEditing)
                          ) : (
                            <span className="text-gray-900">{String(value || "")}</span>
                          )}
                        </td>
                      );
                    })}
                    {(canEdit || canDelete) && (
                      <td className="px-3 py-2 sticky right-0 bg-white z-10">
                        <div className="flex items-center gap-1 justify-end">
                          {isEditing ? (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => handleSave(row, index)}
                                className="h-7 px-2 text-xs"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleCancel(row, index)}
                                className="h-7 px-2 text-xs"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </Button>
                            </>
                          ) : (
                            <>
                              {canEdit && (
                                <Button
                                  variant="outline"
                                  onClick={() => handleEdit(row, index)}
                                  className="h-7 px-2 text-xs"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="outline"
                                  onClick={() => handleDelete(row, index)}
                                  className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:border-red-300"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

