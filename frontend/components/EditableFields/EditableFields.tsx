"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LookupSelect } from "@/components/LookupSelect";
import { cn } from "@/lib/utils";

export interface EditableField {
  id: string;
  label: string;
  type?: "text" | "number" | "email" | "tel" | "date" | "select" | "lookup";
  value?: any;
  defaultValue?: any;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  span?: number; // Grid column span (1-12)
  // For select type
  options?: Array<{ value: string | number; label: string }>;
  // For lookup type - just need lookupKey, config is in lookups.ts
  lookupKey?: string;
  lookupFilter?: Record<string, any>; // Additional filters (e.g., branch_code filtered by bank_code)
  // Custom render function
  render?: (value: any, isEditing: boolean, onChange: (value: any) => void) => React.ReactNode;
}

export interface EditableFieldsProps {
  fields: EditableField[];
  data: Record<string, any>;
  isEditing: boolean;
  onChange?: (fieldId: string, value: any) => void;
  className?: string;
  columns?: number; // Default grid columns (default: 3)
}

export function EditableFields({
  fields,
  data,
  isEditing,
  onChange,
  className,
  columns = 3,
}: EditableFieldsProps) {
  // In read-only mode, don't use localData at all - rely on field.value
  // In edit mode, use localData for state management
  const [localData, setLocalData] = useState<Record<string, any>>(isEditing ? data : {});

  const handleChange = (fieldId: string, value: any) => {
    if (!isEditing) return; // Don't allow changes in read-only mode
    const newData = { ...localData, [fieldId]: value };
    setLocalData(newData);
    if (onChange) {
      onChange(fieldId, value);
    }
  };

  // Update local data when data prop changes, but only in edit mode
  // In read-only mode, we rely on field.value which is set when field is created
  useEffect(() => {
    if (isEditing) {
      setLocalData(data);
    }
  }, [data, isEditing]);

  // Helper to get col-span class
  const getColSpanClass = (span: number) => {
    const spanMap: Record<number, string> = {
      1: "col-span-1",
      2: "col-span-2",
      3: "col-span-3",
      4: "col-span-4",
      5: "col-span-5",
      6: "col-span-6",
    };
    return spanMap[span] || "col-span-1";
  };

  const renderField = (field: EditableField) => {
    // In read-only mode, prioritize field.value (set when field is created)
    // In edit mode, use localData (which can be updated by user)
    // This ensures that values are displayed correctly in both modes
    const value = !isEditing 
      ? (field.value ?? field.defaultValue ?? "")
      : (localData[field.id] ?? field.value ?? field.defaultValue ?? "");
    const fieldSpan = field.span || 1;
    const colSpanClass = getColSpanClass(fieldSpan);

    if (field.render) {
      return (
        <div
          key={field.id}
          className={cn(colSpanClass, field.className)}
        >
          <label className="block text-xs font-medium text-text-muted mb-1">
            {field.label}
            {field.required && <span className="text-red-500 mr-1">*</span>}
          </label>
          {field.render(value, isEditing, (newValue) => handleChange(field.id, newValue))}
        </div>
      );
    }

    if (!isEditing) {
      // For lookup fields, use LookupSelect in disabled mode to show the description
      if (field.type === "lookup" && field.lookupKey) {
        return (
          <div
            key={field.id}
            className={cn(colSpanClass, field.className)}
          >
            <label className="block text-xs font-medium text-text-muted mb-1">
              {field.label}
            </label>
            <LookupSelect
              lookupKey={field.lookupKey}
              value={value}
              onChange={() => {}} // No-op in read-only mode
              disabled={true}
              className="min-h-10 h-auto text-sm"
              filter={field.lookupFilter}
            />
          </div>
        );
      }
      
      // For select fields, show the selected option label
      if (field.type === "select" && field.options) {
        const selectedOption = field.options.find(opt => String(opt.value) === String(value));
        const displayValue = selectedOption ? selectedOption.label : (value ? String(value) : "N/A");
        return (
          <div
            key={field.id}
            className={cn(colSpanClass, field.className)}
          >
            <label className="block text-xs font-medium text-text-muted mb-1">
              {field.label}
            </label>
            <p className="text-sm text-text-main py-1.5">
              {displayValue}
            </p>
          </div>
        );
      }
      
      // For other field types, show the value as text
      // Handle boolean values properly
      let displayValue = value;
      if (typeof value === 'boolean') {
        displayValue = value ? 'כן' : 'לא';
      } else if (value === null || value === undefined || value === '') {
        displayValue = "N/A";
      } else {
        displayValue = String(value);
      }
      
      return (
        <div
          key={field.id}
          className={cn(colSpanClass, field.className)}
        >
          <label className="block text-xs font-medium text-text-muted mb-1">
            {field.label}
          </label>
          <p className="text-sm text-text-main py-1.5">
            {displayValue}
          </p>
        </div>
      );
    }

    // Editing mode
    let inputElement: React.ReactNode;

    switch (field.type) {
      case "number":
        inputElement = (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value ? Number(e.target.value) : null)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            className="h-8 text-sm"
          />
        );
        break;

      case "email":
        inputElement = (
          <Input
            type="email"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            className="h-8 text-sm"
          />
        );
        break;

      case "tel":
        inputElement = (
          <Input
            type="tel"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            className="h-8 text-sm"
          />
        );
        break;

      case "date":
        inputElement = (
          <Input
            type="date"
            value={value ? (value instanceof Date ? value.toISOString().split('T')[0] : value) : ""}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            className="h-8 text-sm"
          />
        );
        break;

      case "select":
        inputElement = (
          <Select
            value={value ?? ""}
            onChange={(e) => handleChange(field.id, e.target.value)}
            disabled={field.disabled}
            className="h-8 text-sm"
          >
            {field.options?.map((option) => (
              <option key={option.value} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </Select>
        );
        break;

      case "lookup":
        if (!field.lookupKey) {
          inputElement = <div className="text-xs text-red-600">Lookup key missing</div>;
        } else {
          inputElement = (
            <LookupSelect
              lookupKey={field.lookupKey}
              value={value}
              onChange={(newValue) => handleChange(field.id, newValue)}
              disabled={field.disabled}
              className="min-h-10 h-auto text-sm"
              filter={field.lookupFilter}
            />
          );
        }
        break;

      default: // text
        inputElement = (
          <Input
            type="text"
            value={value ?? ""}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            className="h-8 text-sm"
          />
        );
    }

    return (
      <div
        key={field.id}
        className={cn(colSpanClass, field.className)}
      >
        <label className="block text-xs font-medium text-text-muted mb-1">
          {field.label}
          {field.required && <span className="text-red-500 mr-1">*</span>}
        </label>
        {inputElement}
      </div>
    );
  };

  // Use explicit Tailwind classes for grid columns to avoid dynamic class issues
  const gridColsClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  }[columns] || "grid-cols-3";

  return (
    <div className={cn("grid gap-3", gridColsClass, className)}>
      {fields.map(renderField)}
    </div>
  );
}

