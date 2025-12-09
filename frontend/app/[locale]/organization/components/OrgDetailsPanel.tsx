"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { getAuthHeader } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { EmployeeTable } from "./EmployeeTable";
import { AssignEmployeeDialog } from "./AssignEmployeeDialog";
import { OrgLevel, OrgUnit } from "../hooks/useOrgData";
import { useDirection } from "@/contexts/DirectionContext";

const API_BASE_URL = "/api";

interface OrgDetailsPanelProps {
  selectedUnitId: number | null;
  levels: OrgLevel[];
  onRefresh: () => void;
}

interface UnitFormData {
  name: string;
  code: string;
  level_key: string;
  parent_id: number | null;
  is_active: boolean;
}

export function OrgDetailsPanel({
  selectedUnitId,
  levels,
  onRefresh,
}: OrgDetailsPanelProps) {
  const { direction } = useDirection();
  const [unit, setUnit] = useState<OrgUnit | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const { register, handleSubmit, reset, watch, setValue } = useForm<UnitFormData>();

  const isActive = watch("is_active");

  useEffect(() => {
    if (selectedUnitId) {
      fetchUnitDetails();
      setIsEditMode(false);
    } else {
      setUnit(null);
    }
  }, [selectedUnitId]);

  const fetchUnitDetails = async () => {
    if (!selectedUnitId) return;

    try {
      setLoading(true);
      const authHeader = getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/org/units/${selectedUnitId}`, {
        headers: { Authorization: authHeader },
      });

      if (!response.ok) throw new Error("Failed to fetch unit details");

      const data = await response.json();
      const unitData = data.data;
      setUnit(unitData);

      // Populate form
      reset({
        name: unitData.name,
        code: unitData.code,
        level_key: unitData.level_key,
        parent_id: unitData.parent_id,
        is_active: unitData.is_active,
      });
    } catch (err: any) {
      console.error("Error fetching unit details:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: UnitFormData) => {
    if (!selectedUnitId) return;

    try {
      const authHeader = getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/org/units/${selectedUnitId}`, {
        method: "PATCH",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update unit");
      }

      await fetchUnitDetails();
      setIsEditMode(false);
      onRefresh();
      alert("Unit updated successfully");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error("Error updating unit:", err);
    }
  };

  if (!selectedUnitId) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          Select an organization unit to view details
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">Loading...</CardContent>
      </Card>
    );
  }

  if (!unit) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-red-500">
          Failed to load unit details
        </CardContent>
      </Card>
    );
  }

  const level = levels.find((l) => l.key === unit.level_key);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{unit.name}</CardTitle>
          {!isEditMode && (
            <Button variant="outline" onClick={() => setIsEditMode(true)}>
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            {isEditMode ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <Input {...register("name", { required: true })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code
                  </label>
                  <Input {...register("code", { required: true })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Level
                  </label>
                  <Input value={level?.display_name || unit.level_key} disabled />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Unit
                  </label>
                  <Input
                    type="number"
                    {...register("parent_id", {
                      setValueAs: (v) => (v === "" ? null : parseInt(v)),
                    })}
                    placeholder="Leave empty for root unit"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => setValue("is_active", checked)}
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">Save</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditMode(false);
                      reset();
                      fetchUnitDetails();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Name
                  </label>
                  <div className="text-sm text-gray-900">{unit.name}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Code
                  </label>
                  <div className="text-sm text-gray-900">{unit.code}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Level
                  </label>
                  <div className="text-sm text-gray-900">
                    {level?.display_name || unit.level_key}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Parent Unit ID
                  </label>
                  <div className="text-sm text-gray-900">
                    {unit.parent_id || "Root unit"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Status
                  </label>
                  <div className="text-sm">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        unit.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {unit.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="employees" className="mt-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Assigned Employees</h3>
              <Button onClick={() => setShowAssignDialog(true)}>Assign Employee</Button>
            </div>
            <EmployeeTable unitId={selectedUnitId} onRefresh={fetchUnitDetails} />
            {showAssignDialog && (
              <AssignEmployeeDialog
                unitId={selectedUnitId}
                open={showAssignDialog}
                onOpenChange={setShowAssignDialog}
                onSuccess={() => {
                  setShowAssignDialog(false);
                  fetchUnitDetails();
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <div className="text-sm text-gray-500">
              Settings tab - Coming soon
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

