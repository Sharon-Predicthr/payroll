"use client";

import { useState, useEffect, useMemo } from "react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getAuthHeader, isAuthenticated } from "@/lib/auth";
import { getLookupConfig, LOOKUP_CONFIGS, LookupConfig } from "@/lib/lookups";

export interface LookupOption {
  value: string | number;
  label: string;
  code?: string; // For code-description format
  description?: string; // For code-description format
  [key: string]: any;
}

export interface LookupSelectProps {
  lookupKey: string; // Unique key for this lookup (e.g., "gender", "departments")
  value?: string | number | null;
  onChange?: (value: string | number | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  filter?: Record<string, any>; // Additional filters for the lookup (e.g., branch_code filtered by bank_code)
  cache?: boolean; // Whether to cache the lookup results
  // Optional overrides (if not using config)
  tableName?: string; // Database table name (if not in config)
  valueKey?: string; // Column name for value (if not in config)
  labelKey?: string; // Column name for label (if not in config)
  displayFormat?: 'code' | 'description' | 'code-description'; // How to display in dropdown
  options?: Array<{ value: string; label: string }>; // For fixed values (if not in config)
}

const lookupCache: Record<string, { data: LookupOption[]; timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function LookupSelect({
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
  // Optional overrides
  tableName: overrideTableName,
  valueKey: overrideValueKey,
  labelKey: overrideLabelKey,
  displayFormat: overrideDisplayFormat,
  options: overrideOptions,
}: LookupSelectProps) {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Get config or use overrides - memoize to prevent re-renders
  const config = useMemo(() => getLookupConfig(lookupKey), [lookupKey]);
  const isFixed = useMemo(() => overrideOptions ? true : (config?.type === 'fixed'), [overrideOptions, config?.type]);
  const tableName = useMemo(() => overrideTableName || config?.tableName, [overrideTableName, config?.tableName]);
  const valueKey = useMemo(() => overrideValueKey || config?.valueKey || 'value', [overrideValueKey, config?.valueKey]);
  const labelKey = useMemo(() => overrideLabelKey || config?.labelKey || 'label', [overrideLabelKey, config?.labelKey]);
  const displayFormat = useMemo(() => overrideDisplayFormat || config?.displayFormat || 'description', [overrideDisplayFormat, config?.displayFormat]);
  const customLabelFields = useMemo(() => config?.customLabelFields, [config?.customLabelFields]);
  const searchable = useMemo(() => config?.searchable || false, [config?.searchable]);
  const searchFields = useMemo(() => config?.searchFields || [], [config?.searchFields]);
  // Memoize fixedOptions with string comparison to prevent unnecessary re-renders
  const fixedOptionsString = useMemo(() => {
    const opts = overrideOptions || config?.options || [];
    return JSON.stringify(opts);
  }, [overrideOptions, config?.options]);
  
  const fixedOptions = useMemo(() => {
    return overrideOptions || config?.options || [];
  }, [fixedOptionsString]);
  
  // Memoize lookupFilter to prevent unnecessary re-renders
  // Compare filter objects by stringifying them
  const filterStringFromProp = useMemo(() => {
    return filter ? JSON.stringify(filter) : '';
  }, [filter]);
  
  const filterStringFromConfig = useMemo(() => {
    return config?.filter ? JSON.stringify(config?.filter) : '';
  }, [config?.filter]);
  
  const lookupFilter = useMemo(() => {
    return filter || config?.filter;
  }, [filterStringFromProp, filterStringFromConfig, filter, config?.filter]);
  
  // Memoize filter string for dependency comparison
  const filterString = useMemo(() => {
    return lookupFilter ? JSON.stringify(lookupFilter) : '';
  }, [lookupFilter]);

  // Force lookup to load when value changes (even if options haven't loaded yet)
  // This ensures that when employee data is loaded, the lookup will find and display the correct value
  useEffect(() => {
    // If we have a value but no options yet, we need to ensure the lookup loads
    // This is especially important when employee data is first loaded
    if (value !== null && value !== undefined && options.length === 0 && !loading && !error && !isFixed) {
      // Trigger a re-fetch by clearing cache or forcing reload
      if (cache && lookupCache[lookupKey]) {
        // Clear cache to force reload
        delete lookupCache[lookupKey];
      }
    }
  }, [value, options.length, loading, error, isFixed, lookupKey, cache]);

  useEffect(() => {
    let cancelled = false;

    const fetchLookup = async () => {
      // Check authentication first
      if (!isAuthenticated()) {
        if (!cancelled) {
          setError("לא מאומת - נא להתחבר מחדש");
          setLoading(false);
          setOptions([]);
        }
        return;
      }

      // Handle fixed values
      if (isFixed) {
        const fixedLookupOptions: LookupOption[] = fixedOptions.map((opt) => ({
          value: opt.value,
          label: opt.label,
        }));
        if (!cancelled) {
          setOptions(fixedLookupOptions);
          setLoading(false);
        }
        return;
      }

      // Check cache first (only for table lookups)
      if (cache && lookupCache[lookupKey]) {
        const cached = lookupCache[lookupKey];
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
          if (!cancelled) {
            setOptions(cached.data);
            setLoading(false);
          }
          return;
        }
      }

      try {
        if (!cancelled) {
          setLoading(true);
          setError(null);
        }

        if (!tableName || !valueKey || !labelKey) {
          throw new Error("Missing required lookup configuration");
        }

        const authHeader = getAuthHeader();
        if (!authHeader) {
          if (!cancelled) {
            setError("לא מאומת - נא להתחבר מחדש");
            setLoading(false);
            setOptions([]);
          }
          return;
        }

        const response = await fetch(`/api/lookup/${lookupKey}`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            table: tableName,
            valueKey,
            labelKey,
            filter: lookupFilter,
            search: searchable && searchTerm ? searchTerm : undefined,
            searchFields: searchable && searchTerm ? searchFields : undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch lookup: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.data) {
          const lookupOptions: LookupOption[] = result.data.map((item: any) => {
            // Backend returns value, code, label, description
            const code = item.code || item[valueKey] || item.value;
            let description = item.description || item[labelKey] || item.label || '';
            
            // If customLabelFields is defined, build description from multiple fields
            if (customLabelFields && customLabelFields.length > 0) {
              const customParts: string[] = [];
              customLabelFields.forEach(field => {
                const fieldValue = item[field];
                if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
                  if (field === 'monthly_car_benefit') {
                    // Format monthly_car_benefit as currency
                    customParts.push(`₪${Number(fieldValue).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
                  } else {
                    customParts.push(String(fieldValue));
                  }
                }
              });
              if (customParts.length > 0) {
                description = customParts.join(' - ');
              }
            }
            
            // Format label based on displayFormat
            // For RTL (Hebrew), show description first, then code
            let label = description;
            if (displayFormat === 'code-description') {
              // For Hebrew/RTL: show description first, then code in parentheses
              label = description ? `${description} (${code})` : String(code);
            } else if (displayFormat === 'code') {
              label = String(code);
            } else {
              // Default to description, fallback to code if description is empty
              label = description || String(code);
            }

            // Preserve the original type of code (number or string) for proper matching
            const finalValue = (typeof code === 'number' || !isNaN(Number(code))) && code !== '' 
              ? (typeof code === 'number' ? code : Number(code))
              : code;

            return {
              value: finalValue, // Save the code (preserve type for matching)
              label: label, // Display formatted label
              code: code,
              description: description,
              ...item,
            };
          });
          
          // Debug log for both department_number and site_number to compare
          if (lookupKey === 'department_number' || lookupKey === 'site_number') {
            console.log(`[LookupSelect ${lookupKey}] Loaded ${lookupOptions.length} options`);
            console.log(`[LookupSelect ${lookupKey}] Current value:`, value, `(type: ${typeof value})`);
            console.log(`[LookupSelect ${lookupKey}] First 3 options:`, lookupOptions.slice(0, 3).map(o => ({
              value: o.value,
              valueType: typeof o.value,
              label: o.label,
              code: o.code,
              description: o.description
            })));
            
            // Check if value matches any option
            const matches = lookupOptions.filter(opt => {
              const optValue = opt.value;
              const optValueStr = String(optValue);
              const optValueNum = typeof optValue === 'number' ? optValue : (isNaN(Number(optValue)) ? null : Number(optValue));
              const valueNum = typeof value === 'number' ? value : (isNaN(Number(value)) ? null : Number(value));
              
              return optValue === value || optValueStr === String(value) || 
                     (valueNum !== null && optValueNum !== null && valueNum === optValueNum);
            });
            console.log(`[LookupSelect ${lookupKey}] Matching options:`, matches.length, matches);
          }

          if (!cancelled) {
            // If we have a value but it's not in the options, add it temporarily
            // This handles the case where the value exists in DB but lookup hasn't loaded yet
            let finalOptions = lookupOptions;
            if (value !== null && value !== undefined && lookupOptions.length > 0) {
              const valueStr = String(value);
              const valueNum = typeof value === 'number' ? value : (isNaN(Number(value)) ? null : Number(value));
              
              // Check if value exists in options (try both string and number comparison)
              const exists = lookupOptions.some(opt => {
                const optValue = opt.value;
                const optValueStr = String(optValue);
                const optValueNum = typeof optValue === 'number' ? optValue : (isNaN(Number(optValue)) ? null : Number(optValue));
                
                // Try exact match
                if (optValue === value || optValueStr === valueStr) {
                  return true;
                }
                // Try numeric match
                if (valueNum !== null && optValueNum !== null && valueNum === optValueNum) {
                  return true;
                }
                return false;
              });
              
              if (!exists) {
                // Try to find the value in the raw data
                const rawItem = result.data.find((item: any) => {
                  const code = item.code || item[valueKey] || item.value;
                  const codeStr = String(code);
                  const codeNum = typeof code === 'number' ? code : (isNaN(Number(code)) ? null : Number(code));
                  
                  // Try exact match
                  if (code === value || codeStr === valueStr) {
                    return true;
                  }
                  // Try numeric match
                  if (valueNum !== null && codeNum !== null && valueNum === codeNum) {
                    return true;
                  }
                  return false;
                });
                
                if (rawItem) {
                  const code = rawItem.code || rawItem[valueKey] || rawItem.value;
                  const description = rawItem.description || rawItem[labelKey] || rawItem.label || '';
                  let label = description;
                  if (displayFormat === 'code-description') {
                    label = description ? `${description} (${code})` : String(code);
                  } else if (displayFormat === 'code') {
                    label = String(code);
                  } else {
                    label = description || String(code);
                  }
                  
                  // Preserve the original type of code for matching
                  const finalValue = (typeof code === 'number' || !isNaN(Number(code))) && code !== '' 
                    ? (typeof code === 'number' ? code : Number(code))
                    : code;
                  
                  // Check if this value already exists in lookupOptions before adding
                  const alreadyExists = lookupOptions.some(opt => {
                    const optValue = opt.value;
                    return optValue === finalValue || String(optValue) === String(finalValue) ||
                           (typeof optValue === 'number' && typeof finalValue === 'number' && optValue === finalValue);
                  });
                  
                  if (!alreadyExists) {
                    finalOptions = [
                      { value: finalValue, label, code, description, ...rawItem },
                      ...lookupOptions
                    ];
                  }
                } else {
                  // Value not found in lookup, add it as-is only if it doesn't already exist
                  const alreadyExists = lookupOptions.some(opt => {
                    const optValue = opt.value;
                    return optValue === value || String(optValue) === String(value) ||
                           (typeof optValue === 'number' && typeof value === 'number' && optValue === value);
                  });
                  
                  if (!alreadyExists) {
                    finalOptions = [
                      { value: value, label: String(value), code: String(value), description: String(value) },
                      ...lookupOptions
                    ];
                  }
                }
              }
            }
            
            setOptions(finalOptions);

            // Cache the results (cache the original lookupOptions, not the modified one)
            if (cache) {
              lookupCache[lookupKey] = {
                data: lookupOptions,
                timestamp: Date.now(),
              };
            }
            
    // Debug log for both department_number and site_number to compare
    if (lookupKey === 'department_number' || lookupKey === 'site_number') {
      const foundMatch = finalOptions.some(opt => {
        const optValue = opt.value;
        const optValueStr = String(optValue);
        const optValueNum = typeof optValue === 'number' ? optValue : (isNaN(Number(optValue)) ? null : Number(optValue));
        const valueNum = typeof value === 'number' ? value : (isNaN(Number(value)) ? null : Number(value));
        return optValue === value || optValueStr === String(value) || 
               (valueNum !== null && optValueNum !== null && valueNum === optValueNum);
      });
      
      console.log(`[LookupSelect ${lookupKey}] After setting options:`, {
        value,
        valueType: typeof value,
        finalOptionsCount: finalOptions.length,
        foundMatch,
        firstFewOptions: finalOptions.slice(0, 3).map(o => ({ value: o.value, label: o.label, valueType: typeof o.value }))
      });
    }
          }
        } else {
          if (!cancelled) {
            setOptions([]);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error(`Error fetching lookup ${lookupKey}:`, err);
          setError(err.message || "שגיאה בטעינת הנתונים");
          setOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchLookup();

    return () => {
      cancelled = true;
    };
  }, [lookupKey, tableName, valueKey, labelKey, filterString, cache, isFixed, fixedOptionsString, displayFormat, lookupFilter, customLabelFields, searchable, searchTerm, searchFields]);

  // Additional effect: If we have a value but options are empty/loading, ensure we load the lookup
  // This is critical when employee data is first loaded - we need to fetch the lookup to find the matching value
  useEffect(() => {
    // Only trigger if:
    // 1. We have a value
    // 2. Options are empty or we're not loading
    // 3. It's not a fixed lookup (those load immediately)
    // 4. We're authenticated
    if (value !== null && value !== undefined && 
        options.length === 0 && !loading && !error && !isFixed && isAuthenticated()) {
      // Clear cache to force reload
      if (cache && lookupCache[lookupKey]) {
        delete lookupCache[lookupKey];
      }
      // The main useEffect will pick this up and reload
    }
  }, [value, options.length, loading, error, isFixed, lookupKey, cache]);

  const handleChange = (newValue: string) => {
    if (onChange) {
      if (newValue === "" || newValue === "null") {
        onChange(null);
      } else {
        // Try to convert to number if the value looks like a number
        const numValue = Number(newValue);
        onChange(isNaN(numValue) ? newValue : numValue);
      }
    }
  };

  // Ensure the current value is in options (for cases where value exists but options haven't loaded)
  // This MUST be before any early returns to avoid "Rendered more hooks" error
  const displayOptions = useMemo(() => {
    if (value === null || value === undefined) {
      return options;
    }
    
    // Normalize value for comparison (handle both string and number)
    const valueStr = String(value);
    const valueNum = typeof value === 'number' ? value : (isNaN(Number(value)) ? null : Number(value));
    
    // Check if value exists in options (try both string and number comparison)
    const exists = options.some(opt => {
      const optValue = opt.value;
      const optValueStr = String(optValue);
      const optValueNum = typeof optValue === 'number' ? optValue : (isNaN(Number(optValue)) ? null : Number(optValue));
      
      // Try exact match first
      if (optValue === value || optValueStr === valueStr) {
        return true;
      }
      // Try numeric match if both are numbers
      if (valueNum !== null && optValueNum !== null && valueNum === optValueNum) {
        return true;
      }
      return false;
    });
    
    // Debug log for department_number
    if (lookupKey === 'department_number' && !exists && options.length > 0) {
      console.log(`[LookupSelect ${lookupKey}] Value ${value} (${typeof value}) not found in options:`, options.map(o => `${o.value} (${typeof o.value})`));
    }
    
    if (!exists) {
      // Value not in options, add it at the beginning
      // If options are still loading (empty), show the code temporarily
      // Once options load, they will replace this
      // But first check if it's not already in options (to prevent duplicates)
      const alreadyInOptions = options.some(opt => {
        const optValue = opt.value;
        return optValue === value || String(optValue) === valueStr ||
               (typeof optValue === 'number' && typeof value === 'number' && optValue === value);
      });
      
      if (!alreadyInOptions) {
        return [
          { value: value, label: String(value), code: String(value), description: String(value) },
          ...options
        ];
      }
    }
    
    // Remove duplicates based on value (keep first occurrence) to prevent React key warnings
    const seen = new Set<string | number>();
    return options.filter(opt => {
      const key = String(opt.value);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [options, value, lookupKey]);

  // Normalize the value for the Select component - MUST be before early returns
  const selectedValue = useMemo(() => {
    if (value === null || value === undefined) {
      return "";
    }
    
    // Try to find exact match in displayOptions
    const matchingOption = displayOptions.find(opt => {
      const optValue = opt.value;
      const optValueStr = String(optValue);
      const optValueNum = typeof optValue === 'number' ? optValue : (isNaN(Number(optValue)) ? null : Number(optValue));
      const valueNum = typeof value === 'number' ? value : (isNaN(Number(value)) ? null : Number(value));
      
      // Try exact match
      if (optValue === value || optValueStr === String(value)) {
        return true;
      }
      // Try numeric match
      if (valueNum !== null && optValueNum !== null && valueNum === optValueNum) {
        return true;
      }
      return false;
    });
    
    // Debug log for department_number
    if (lookupKey === 'department_number') {
      console.log(`[LookupSelect ${lookupKey}] selectedValue calculation:`, {
        value,
        valueType: typeof value,
        matchingOption: matchingOption ? { value: matchingOption.value, label: matchingOption.label } : null,
        displayOptionsCount: displayOptions.length
      });
    }
    
    if (matchingOption) {
      return String(matchingOption.value);
    }
    
    // Fallback to string conversion
    return String(value);
  }, [displayOptions, value, lookupKey]);

  if (loading) {
    return (
      <Select
        value=""
        disabled
        className={className}
      >
        <option>טוען...</option>
      </Select>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-600 p-2 border border-red-200 rounded">
        {error}
      </div>
    );
  }

  // If searchable, show input field for search
  if (searchable && !disabled) {
    return (
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="חפש..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-sm"
        />
        <Select
          value={selectedValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className={className}
        >
          {allowEmpty && <option value="">{emptyLabel}</option>}
          {displayOptions.map((option, index) => {
            // Create unique key to prevent React warnings about duplicate keys
            // Use combination of lookupKey, value, and index to ensure uniqueness
            const uniqueKey = `${lookupKey}-${String(option.value)}-${index}`;
            return (
              <option key={uniqueKey} value={String(option.value)}>
                {option.label}
              </option>
            );
          })}
        </Select>
      </div>
    );
  }

  return (
    <Select
      value={selectedValue}
      onChange={(e) => handleChange(e.target.value)}
      disabled={disabled}
      className={className}
    >
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {displayOptions.map((option, index) => {
        // Create unique key to prevent React warnings about duplicate keys
        // Use combination of lookupKey, value, and index to ensure uniqueness
        const uniqueKey = `${lookupKey}-${String(option.value)}-${index}`;
        return (
          <option key={uniqueKey} value={String(option.value)}>
            {option.label}
          </option>
        );
      })}
    </Select>
  );
}

// Helper function to clear lookup cache
export function clearLookupCache(lookupKey?: string) {
  if (lookupKey) {
    delete lookupCache[lookupKey];
  } else {
    Object.keys(lookupCache).forEach((key) => delete lookupCache[key]);
  }
}

