"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeader } from "@/lib/auth";

const API_BASE_URL = "/api";

export interface OrgLevel {
  id: number;
  tenant_id: string;
  key: string;
  display_name: string;
  level_order: number;
  is_active: boolean;
  created_at: string;
}

export interface OrgUnit {
  id: number;
  tenant_id: string;
  level_key: string;
  parent_id: number | null;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  level?: string; // display_name from org_levels
  children?: OrgUnit[];
}

export function useOrgData() {
  const [levels, setLevels] = useState<OrgLevel[]>([]);
  const [tree, setTree] = useState<OrgUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLevels = useCallback(async () => {
    try {
      const authHeader = getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      console.log("[useOrgData] Fetching levels from:", `${API_BASE_URL}/org/levels`);
      const response = await fetch(`${API_BASE_URL}/org/levels`, {
        headers: { Authorization: authHeader },
      });

      console.log("[useOrgData] Levels response status:", response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[useOrgData] Levels error response:", errorData);
        throw new Error(errorData.message || "Failed to fetch levels");
      }

      const data = await response.json();
      console.log("[useOrgData] Levels data received:", data);
      console.log("[useOrgData] Levels array:", data.data || data);
      setLevels(data.data || data || []);
    } catch (err: any) {
      setError(err.message);
      console.error("[useOrgData] Error fetching levels:", err);
    }
  }, []);

  const fetchTree = useCallback(async () => {
    try {
      setLoading(true);
      const authHeader = getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const url = `${API_BASE_URL}/org/tree`;
      console.log("[useOrgData] Fetching tree from:", url);
      console.log("[useOrgData] Auth header present:", !!authHeader);

      const response = await fetch(url, {
        headers: { Authorization: authHeader },
      });

      console.log("[useOrgData] Response status:", response.status);
      console.log("[useOrgData] Response ok:", response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[useOrgData] Error response:", errorData);
        throw new Error(errorData.message || "Failed to fetch tree");
      }

      const data = await response.json();
      console.log("[useOrgData] Tree data received:", data);
      console.log("[useOrgData] Tree data.data:", data.data);
      console.log("[useOrgData] Tree data.data length:", data.data?.length || 0);
      const treeData = data.data || data || [];
      console.log("[useOrgData] Setting tree with", treeData.length, "root units");
      setTree(treeData);
      setError(null);
    } catch (err: any) {
      console.error("[useOrgData] Error fetching tree:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTree = useCallback(async () => {
    await fetchTree();
  }, [fetchTree]);

  useEffect(() => {
    fetchLevels();
    fetchTree();
  }, [fetchLevels, fetchTree]);

  return {
    levels,
    tree,
    loading,
    error,
    refreshTree,
    fetchLevels,
  };
}

