"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useDirection } from "@/contexts/DirectionContext";
import { OrgUnit } from "../hooks/useOrgData";
import { ChevronRight, ChevronDown, MoreVertical, Plus, Pencil, Trash2 } from "lucide-react";

interface OrgTreeProps {
  treeData: OrgUnit[];
  selectedUnitId: number | null;
  onSelect: (unitId: number) => void;
  onAdd: (parentId: number | null) => void;
  onEdit: (unitId: number) => void;
  onDelete: (unitId: number) => void;
}

interface TreeNodeProps {
  unit: OrgUnit;
  level: number;
  selectedUnitId: number | null;
  expandedNodes: Set<number>;
  onToggleExpand: (id: number) => void;
  onSelect: (unitId: number) => void;
  onAdd: (parentId: number | null) => void;
  onEdit: (unitId: number) => void;
  onDelete: (unitId: number) => void;
}

function TreeNode({
  unit,
  level,
  selectedUnitId,
  expandedNodes,
  onToggleExpand,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}: TreeNodeProps) {
  const { direction } = useDirection();
  const [showMenu, setShowMenu] = useState(false);
  const hasChildren = unit.children && unit.children.length > 0;
  const isExpanded = expandedNodes.has(unit.id);
  const isSelected = selectedUnitId === unit.id;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand(unit.id);
    }
  };

  const handleSelect = () => {
    onSelect(unit.id);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onAdd(unit.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onEdit(unit.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (confirm(`Are you sure you want to delete "${unit.name}"?`)) {
      onDelete(unit.id);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer group hover:bg-gray-50 transition-colors",
          isSelected && "bg-[#E6F0FF] border-l-4 border-[#4287f5]",
          direction === "rtl" && isSelected && "border-l-0 border-r-4"
        )}
        style={{ marginLeft: direction === "rtl" ? 0 : `${level * 16}px`, marginRight: direction === "rtl" ? `${level * 16}px` : 0 }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Icon */}
        <button
          onClick={handleToggle}
          className={cn(
            "w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Unit Name */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{unit.name}</div>
          <div className="text-xs text-gray-500 truncate">{unit.code}</div>
        </div>

        {/* Actions Menu */}
        <div className="relative flex items-center gap-1">
          {/* Quick Add Child Button - Always visible */}
          <button
            onClick={handleAdd}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 rounded transition-opacity text-blue-600"
            title="Add Child Unit"
            aria-label="Add Child Unit"
          >
            <Plus className="w-4 h-4" />
          </button>
          {/* More Actions Menu */}
          <button
            onClick={handleMenuClick}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
            title="More actions"
            aria-label="More actions"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div
                className={cn(
                  "absolute z-20 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1",
                  direction === "rtl" ? "left-0" : "right-0"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleAdd}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left rtl:text-right"
                >
                  <Plus className="w-4 h-4" />
                  Add Child
                </button>
                <button
                  onClick={handleEdit}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left rtl:text-right"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left rtl:text-right"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {unit.children!.map((child) => (
            <TreeNode
              key={child.id}
              unit={child}
              level={level + 1}
              selectedUnitId={selectedUnitId}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgTree({
  treeData,
  selectedUnitId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}: OrgTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  const handleToggleExpand = (id: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  return (
    <div className="h-full overflow-y-auto">
      {treeData.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-500">
          No organization units found. Create your first unit to get started.
        </div>
      ) : (
        <div className="p-2">
          {treeData.map((unit) => (
            <TreeNode
              key={unit.id}
              unit={unit}
              level={0}
              selectedUnitId={selectedUnitId}
              expandedNodes={expandedNodes}
              onToggleExpand={handleToggleExpand}
              onSelect={onSelect}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

