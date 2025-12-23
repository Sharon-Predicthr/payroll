"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { getAuthHeader, isAuthenticated } from "@/lib/auth";
import { getLookupConfig, LookupConfig } from "@/lib/lookups";
import { cn } from "@/lib/utils";

export interface LookupGridOption {
  value: string | number;
  label: string;
  [key: string]: any; // All fields from the table
}

export interface LookupGridSelectProps {
  lookupKey: string;
  value?: string | number | null;
  onChange?: (value: string | number | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  filter?: Record<string, any>;
  cache?: boolean;
  // Grid display options
  displayColumns?: string[]; // Which columns to display in the grid
  columnLabels?: Record<string, string>; // Translation map for column names (e.g., { 'car_id': 'קוד', 'make_name': 'רכב' })
  searchable?: boolean;
  searchFields?: string[];
}

const lookupGridCache: Record<string, { data: LookupGridOption[]; timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function LookupGridSelect({
  lookupKey,
  value,
  onChange,
  placeholder = "בחר...",
  className,
  disabled = false,
  allowEmpty = true,
  emptyLabel = "ללא",
  filter,
  cache = true,
  displayColumns,
  columnLabels = {},
  searchable = true,
  searchFields = [],
}: LookupGridSelectProps) {
  const [options, setOptions] = useState<LookupGridOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<LookupGridOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get config
  const config = useMemo(() => getLookupConfig(lookupKey), [lookupKey]);
  const tableName = useMemo(() => config?.tableName, [config?.tableName]);
  const valueKey = useMemo(() => config?.valueKey || 'value', [config?.valueKey]);
  const labelKey = useMemo(() => config?.labelKey || 'label', [config?.labelKey]);
  const finalSearchable = useMemo(() => searchable || config?.searchable || false, [searchable, config?.searchable]);
  const finalSearchFields = useMemo(() => searchFields.length > 0 ? searchFields : (config?.searchFields || []), [searchFields, config?.searchFields]);

  // Fetch lookup data
  useEffect(() => {
    let cancelled = false;

    const fetchLookup = async () => {
      if (!isAuthenticated()) {
        if (!cancelled) {
          setError("לא מאומת - נא להתחבר מחדש");
          setLoading(false);
          setOptions([]);
        }
        return;
      }

      // Check cache first
      if (cache && lookupGridCache[lookupKey]) {
        const cached = lookupGridCache[lookupKey];
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
          if (!cancelled) {
            setOptions(cached.data);
            setLoading(false);
          }
          return;
        }
      }

      if (!tableName) {
        if (!cancelled) {
          setError("לא נמצאה הגדרה לטבלה");
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const authHeader = getAuthHeader();
        if (!authHeader) {
          throw new Error("לא מאומת");
        }

        // Use POST method like LookupSelect
        const requestBody: any = {
          table: tableName,
          valueKey: valueKey,
          labelKey: labelKey,
        };

        if (filter) {
          requestBody.filter = filter;
        }

        if (finalSearchable && searchTerm) {
          requestBody.search = searchTerm;
          requestBody.searchFields = finalSearchFields;
        }

        const response = await fetch(`/api/lookup/${lookupKey}`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "שגיאה בטעינת נתונים");
        }

        const result = await response.json();
        const lookupData = result.data || result || [];

        // Map to LookupGridOption format - include all fields
        const mappedOptions: LookupGridOption[] = lookupData.map((row: any) => ({
          value: row[valueKey] ?? row.value ?? row.code,
          label: row[labelKey] ?? row.label ?? row.description ?? String(row[valueKey] ?? row.value ?? ''),
          ...row, // Include all fields from the table
        }));

        if (!cancelled) {
          setOptions(mappedOptions);
          if (cache) {
            lookupGridCache[lookupKey] = {
              data: mappedOptions,
              timestamp: Date.now(),
            };
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "שגיאה בטעינת נתונים");
          setLoading(false);
        }
      }
    };

    fetchLookup();

    return () => {
      cancelled = true;
    };
  }, [lookupKey, tableName, valueKey, labelKey, filter, cache, finalSearchable, searchTerm, finalSearchFields]);

  // Find selected option - wait for options to load before clearing
  // This effect runs whenever value, options, loading, or error changes
  useEffect(() => {
    if (value !== null && value !== undefined) {
      if (options.length > 0) {
        // Options loaded - find the matching option (compare as strings to handle number/string mismatch)
        const found = options.find(opt => {
          const optValue = String(opt.value);
          const searchValue = String(value);
          return optValue === searchValue;
        });
        if (found) {
          // Only update if the found option is different from current selectedOption
          if (!selectedOption || String(selectedOption.value) !== String(found.value)) {
            setSelectedOption(found);
          }
        } else {
          // Value exists but not found in options - create temporary option
          // This can happen if the value is valid but options haven't loaded yet
          // Only update if current selectedOption doesn't match the value
          if (!selectedOption || String(selectedOption.value) !== String(value)) {
            setSelectedOption({
              value: value,
              label: String(value),
            });
          }
        }
      } else if (!loading && !error) {
        // Options not loaded yet, but we have a value - keep a temporary option
        // This ensures the value is displayed even before options are loaded
        // Only update if current selectedOption doesn't match the value
        if (!selectedOption || String(selectedOption.value) !== String(value)) {
          setSelectedOption({
            value: value,
            label: String(value),
          });
        }
      }
    } else {
      // Value is null/undefined - clear selection
      if (selectedOption !== null) {
        setSelectedOption(null);
      }
    }
  }, [value, options, loading, error, selectedOption]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Get all column names from options (if displayColumns not provided)
  const allColumns = useMemo(() => {
    if (displayColumns && displayColumns.length > 0) {
      return displayColumns;
    }
    if (options.length > 0) {
      // Get all keys from the first option (excluding value and label)
      const firstOption = options[0];
      return Object.keys(firstOption).filter(key => key !== 'value' && key !== 'label');
    }
    return [];
  }, [options, displayColumns]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!finalSearchable || !searchTerm) {
      return options;
    }
    const term = searchTerm.toLowerCase();
    return options.filter(opt => {
      if (finalSearchFields.length > 0) {
        return finalSearchFields.some(field => {
          const fieldValue = opt[field];
          return fieldValue && String(fieldValue).toLowerCase().includes(term);
        });
      }
      // If no searchFields specified, search in all string fields
      return Object.values(opt).some(val => 
        val && String(val).toLowerCase().includes(term)
      );
    });
  }, [options, searchTerm, finalSearchable, finalSearchFields]);

  const handleSelect = (option: LookupGridOption) => {
    setSelectedOption(option);
    if (onChange) {
      onChange(option.value);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSelectedOption(null);
    if (onChange) {
      onChange(null);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  // Get display value - show value if we have one but option not found yet
  const displayValue = selectedOption 
    ? (selectedOption[labelKey] || selectedOption.label || String(selectedOption.value))
    : (value !== null && value !== undefined 
        ? String(value) // Show the value if no option found yet (while loading)
        : (allowEmpty ? emptyLabel : placeholder));

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Input field */}
      <div
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
          "text-text-main placeholder:text-text-muted",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:border-primary",
          "focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors cursor-pointer",
          isOpen && "ring-2 ring-primary border-primary"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          readOnly
          className="flex-1 outline-none bg-transparent cursor-pointer"
        />
        <svg
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform",
            isOpen && "transform rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden flex flex-col">
          {/* Search input */}
          {finalSearchable && (
            <div className="p-2 border-b border-gray-200">
              <Input
                type="text"
                placeholder="חפש..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
          )}

          {/* Grid table */}
          <div className="overflow-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                טוען...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-red-500">
                {error}
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                לא נמצאו תוצאות
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {allColumns.map((col) => (
                      <th
                        key={col}
                        className="px-2 py-2 text-right font-semibold text-gray-700 border-b border-gray-200"
                      >
                        {columnLabels[col] || col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOptions.map((option, index) => (
                    <tr
                      key={`${option.value}-${index}`}
                      onClick={() => handleSelect(option)}
                      className={cn(
                        "cursor-pointer hover:bg-blue-50 transition-colors",
                        selectedOption?.value === option.value && "bg-blue-100"
                      )}
                    >
                      {allColumns.map((col) => (
                        <td
                          key={col}
                          className="px-2 py-2 text-right border-b border-gray-100"
                        >
                          {option[col] !== null && option[col] !== undefined
                            ? String(option[col])
                            : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Clear button */}
          {allowEmpty && selectedOption && (
            <div className="p-2 border-t border-gray-200">
              <button
                onClick={handleClear}
                className="w-full text-xs text-gray-600 hover:text-gray-800 text-center"
              >
                נקה בחירה
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

