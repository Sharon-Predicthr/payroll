"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { OrgLevel } from "../hooks/useOrgData";

interface CreateUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levels: OrgLevel[];
  parentId?: number | null;
  parentName?: string;
  parentLevelOrder?: number;
  onSuccess: (data: {
    level_key: string;
    parent_id: number | null;
    name: string;
    code: string;
    is_active: boolean;
  }) => Promise<void>;
}

export function CreateUnitDialog({
  open,
  onOpenChange,
  levels,
  parentId,
  parentName,
  parentLevelOrder,
  onSuccess,
}: CreateUnitDialogProps) {
  const [levelKey, setLevelKey] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const hasInitialized = useRef(false);

  // Filter levels based on parent
  // Root units must be level 1 (Region)
  // Child units must be a level higher than parent's level
  const availableLevels = useMemo(() => {
    if (!parentId) {
      // Root units: only level 1 (Region)
      return levels.filter((l) => l.is_active && l.level_order === 1);
    }
    
    // For child units, show only levels with order > parent's level order
    if (parentLevelOrder !== undefined) {
      return levels.filter((l) => l.is_active && l.level_order > parentLevelOrder);
    }
    
    // Fallback: show all active levels > 1 (backend will validate)
    return levels.filter((l) => l.is_active && l.level_order > 1);
  }, [parentId, parentLevelOrder, levels]);

  // Only reset form when dialog FIRST opens, not on every render
  useEffect(() => {
    if (open && !hasInitialized.current) {
      const defaultLevelKey = parentId ? "" : (availableLevels[0]?.key || "");
      setLevelKey(defaultLevelKey);
      setName("");
      setCode("");
      setIsActive(true);
      hasInitialized.current = true;
    }
    if (!open) {
      hasInitialized.current = false;
    }
  }, [open, parentId, availableLevels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!levelKey) {
      alert("Please select a level");
      return;
    }
    if (!name.trim()) {
      alert("Please enter a unit name");
      return;
    }
    if (!code.trim()) {
      alert("Please enter a unit code");
      return;
    }

    // Call onSuccess and let it handle the async operation
    // Don't close dialog here - let the parent handle it after success
    try {
      await onSuccess({
        level_key: levelKey,
        parent_id: parentId || null,
        name: name.trim(),
        code: code.trim(),
        is_active: isActive,
      });
      // Dialog will be closed by parent after successful creation
    } catch (error) {
      // Error already handled in parent, just keep dialog open
      console.error("[CreateUnitDialog] Error in onSuccess:", error);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {parentId ? `Add Child Unit${parentName ? ` to ${parentName}` : ""}` : "Add Root Unit"}
          </DialogTitle>
        </DialogHeader>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(false);
          }}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-10"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level <span className="text-red-500">*</span>
            </label>
            <select
              value={levelKey}
              onChange={(e) => setLevelKey(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a level</option>
              {availableLevels.length === 0 ? (
                <option value="" disabled>No levels available. Please create levels first.</option>
              ) : (
                availableLevels.map((level) => (
                  <option key={level.id} value={level.key}>
                    {level.display_name} (Order: {level.level_order})
                  </option>
                ))
              )}
            </select>
            {!parentId && availableLevels.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Root units must be Region level (level 1). To create Factory, Section, Department, or Work Center units, add them as children of existing units.
              </p>
            )}
            {availableLevels.length === 0 && (
              <p className="text-xs text-red-500 mt-1">No active levels found. Please create organization levels first.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Enter unit name"
              className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Enter unit code"
              className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              autoComplete="off"
            />
          </div>

          {parentId && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Parent Unit
              </label>
              <input
                type="text"
                value={parentName || `Unit ID: ${parentId}`}
                disabled
                className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <label className="text-sm font-medium text-gray-700">Active</label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Unit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
