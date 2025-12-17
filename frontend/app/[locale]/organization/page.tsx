"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/PageShell";
import { OrgTree } from "./components/OrgTree";
import { OrgDetailsPanel } from "./components/OrgDetailsPanel";
import { CreateUnitDialog } from "./components/CreateUnitDialog";
import { useOrgData } from "./hooks/useOrgData";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getAuthHeader } from "@/lib/auth";
import { isAuthenticated } from "@/lib/auth";
import { useDirection } from "@/contexts/DirectionContext";
import { cn } from "@/lib/utils";

const API_BASE_URL = "/api";

export const dynamic = "force-dynamic";

export default function OrganizationPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("common");
  const { direction } = useDirection();
  const { levels, tree, loading, error, refreshTree, fetchLevels } = useOrgData();
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createDialogParent, setCreateDialogParent] = useState<{ 
    id: number | null; 
    name?: string;
    level_key?: string;
    level_order?: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  if (!isAuthenticated()) {
    router.push(`/${locale}/login`);
    return null;
  }

  const handleCreateDefaultLevels = async () => {
    if (!confirm("This will create 5 default organization levels (Region, Factory, Section, Department, Work Center). Continue?")) {
      return;
    }

    try {
      const authHeader = getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const defaultLevels = [
        { key: 'region', display_name: 'Region', level_order: 1, is_active: true },
        { key: 'factory', display_name: 'Factory', level_order: 2, is_active: true },
        { key: 'section', display_name: 'Section', level_order: 3, is_active: true },
        { key: 'department', display_name: 'Department', level_order: 4, is_active: true },
        { key: 'work_center', display_name: 'Work Center', level_order: 5, is_active: true },
      ];

      for (const level of defaultLevels) {
        const response = await fetch(`${API_BASE_URL}/org/levels`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(level),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || `Failed to create level: ${level.display_name}`);
        }
      }

      alert("Default organization levels created successfully!");
      fetchLevels(); // Refresh levels list
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error("Error creating default levels:", err);
    }
  };

  const handleAddRoot = () => {
    setCreateDialogParent(null);
    setShowCreateDialog(true);
  };

  const handleAdd = (parentId: number | null) => {
    // Find parent unit info from tree
    const findUnit = (units: typeof tree, id: number | null): OrgUnit | undefined => {
      for (const unit of units) {
        if (unit.id === id) return unit;
        if (unit.children) {
          const found = findUnit(unit.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };

    const parentUnit = parentId ? findUnit(tree, parentId) : undefined;
    setCreateDialogParent({ 
      id: parentId, 
      name: parentUnit?.name,
      level_key: parentUnit?.level_key,
      level_order: parentUnit ? levels.find(l => l.key === parentUnit.level_key)?.level_order : undefined
    });
    setShowCreateDialog(true);
  };

  const handleEdit = (unitId: number) => {
    setSelectedUnitId(unitId);
    // Edit mode will be handled in OrgDetailsPanel
  };

  const handleDelete = async (unitId: number) => {
    try {
      const authHeader = getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/org/units/${unitId}`, {
        method: "DELETE",
        headers: { Authorization: authHeader },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete unit");
      }

      refreshTree();
      if (selectedUnitId === unitId) {
        setSelectedUnitId(null);
      }
      alert("Unit deleted successfully");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error("Error deleting unit:", err);
    }
  };

  const createUnit = async (data: {
    level_key: string;
    parent_id: number | null;
    name: string;
    code: string;
    is_active: boolean;
  }) => {
    try {
      const authHeader = getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      console.log("[Organization] ===== Creating unit ===== ");
      console.log("[Organization] Unit data:", JSON.stringify(data, null, 2));
      console.log("[Organization] API URL:", `${API_BASE_URL}/org/units`);

      const response = await fetch(`${API_BASE_URL}/org/units`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      console.log("[Organization] Response status:", response.status);
      console.log("[Organization] Response ok:", response.ok);

      const result = await response.json();
      console.log("[Organization] Response data:", JSON.stringify(result, null, 2));

      if (!response.ok) {
        const errorMessage = result.message || result.error || "Failed to create unit";
        console.error("[Organization] ❌ Error response:", result);
        throw new Error(errorMessage);
      }

      if (!result.success) {
        throw new Error(result.message || "Failed to create unit");
      }

      console.log("[Organization] ✅ Unit created successfully:", result.data);
      
      // Close dialog first
      setShowCreateDialog(false);
      setCreateDialogParent(null);

      // Show success message
      alert(`✅ Unit "${data.name}" created successfully!`);
      
      // Force tree refresh - wait a moment for backend to commit
      console.log("[Organization] ⏳ Waiting for backend to commit...");
      await new Promise(resolve => setTimeout(resolve, 800)); // Wait 800ms for backend
      
      console.log("[Organization] 🔄 Calling refreshTree...");
      try {
        await refreshTree();
        console.log("[Organization] ✅ Tree refresh call completed");
        
        // Wait for state to update and component to re-render
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Select the newly created unit after tree is refreshed
        if (result.data?.id) {
          setSelectedUnitId(result.data.id);
          console.log("[Organization] ✅ Selected new unit ID:", result.data.id);
          
          // Force another refresh after selection to ensure tree is fully updated
          await new Promise(resolve => setTimeout(resolve, 200));
          await refreshTree();
          console.log("[Organization] ✅ Final tree refresh completed");
        }
      } catch (refreshError) {
        console.error("[Organization] ❌ Error refreshing tree:", refreshError);
        // Try one more time
        setTimeout(async () => {
          await refreshTree();
        }, 1000);
      }
    } catch (err: any) {
      console.error("[Organization] ❌ Error creating unit:", err);
      alert(`❌ Error: ${err.message || "Unknown error occurred"}`);
      throw err; // Re-throw to prevent dialog from closing on error
    }
  };

  return (
    <PageShell>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Organization Structure
          </h1>
          <p className="text-sm text-gray-600">
            Manage your organization hierarchy and assign employees to units
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Panel - Tree */}
          <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Organization Tree</h2>
              <div className="flex gap-2">
                {levels.length === 0 && (
                  <Button 
                    onClick={handleCreateDefaultLevels} 
                    className="h-9 px-3 text-sm bg-blue-600 hover:bg-blue-700"
                    title="Create default organization levels"
                  >
                    <Plus className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                    Setup Levels
                  </Button>
                )}
                <Button 
                  onClick={async () => {
                    console.log("[Organization] 🔄 Manual refresh triggered");
                    setSelectedUnitId(null);
                    await refreshTree();
                    console.log("[Organization] ✅ Manual refresh completed");
                  }} 
                  className="h-9 px-3 text-sm" 
                  variant="outline"
                  title="Refresh tree"
                >
                  🔄
                </Button>
                <Button onClick={handleAddRoot} className="h-9 px-3 text-sm" disabled={levels.length === 0}>
                  <Plus className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  Add Root
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
              ) : error ? (
                <div className="p-4 text-center text-sm text-red-500">
                  <div>Error: {error}</div>
                  <button
                    onClick={() => refreshTree()}
                    className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {tree.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      <div>No organization units found.</div>
                      <div className="text-xs text-gray-400 mt-2">
                        <div>Tree array length: {tree.length}</div>
                        <div>Loading: {loading ? 'Yes' : 'No'}</div>
                        <div>Error: {error || 'None'}</div>
                        <button
                          onClick={() => refreshTree()}
                          className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Refresh Tree
                        </button>
                      </div>
                    </div>
                  ) : (
                    <OrgTree
                      key={`tree-${tree.length}-${tree.map(u => u.id).join('-')}`}
                      treeData={tree}
                      selectedUnitId={selectedUnitId}
                      onSelect={setSelectedUnitId}
                      onAdd={handleAdd}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Panel - Details */}
          <div className="flex-1 min-w-0">
            <OrgDetailsPanel
              selectedUnitId={selectedUnitId}
              levels={levels}
              onRefresh={refreshTree}
            />
          </div>
        </div>
      </div>

      {/* Create Unit Dialog */}
      <CreateUnitDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            setCreateDialogParent(null);
          }
        }}
        levels={levels}
        parentId={createDialogParent?.id ?? undefined}
        parentName={createDialogParent?.name}
        parentLevelOrder={createDialogParent?.level_order}
        onSuccess={createUnit}
      />
    </PageShell>
  );
}

