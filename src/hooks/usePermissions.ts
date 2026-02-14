'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PermissionResult {
  can_view_effective: boolean;
  can_create_effective: boolean;
  can_edit_effective: boolean;
  can_duplicate_effective: boolean;
  can_remove_effective: boolean;
  can_set_visibility_effective: boolean;
  can_lock_effective: boolean;
  [key: string]: boolean;
}

const DEFAULT_PERMISSIONS: PermissionResult = {
  can_view_effective: false,
  can_create_effective: false,
  can_edit_effective: false,
  can_duplicate_effective: false,
  can_remove_effective: false,
  can_set_visibility_effective: false,
  can_lock_effective: false,
};

export function usePermissions(
  userId: string | null | undefined,
  objectType: 'folder' | 'document',
  objectId: string | null | undefined
) {
  const [permissions, setPermissions] = useState<PermissionResult>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (!userId || !objectId) {
      setPermissions(DEFAULT_PERMISSIONS);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/permissions/object?user=user:${userId}&object=${objectType}:${objectId}`
      );
      if (res.ok) {
        const data = await res.json();
        setPermissions({ ...DEFAULT_PERMISSIONS, ...data.permissions });
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
      setLoading(false);
    }
  }, [userId, objectType, objectId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return { permissions, loading, refetch: fetchPermissions };
}

export interface RoleAssignment {
  user: string;
  relation: string;
  object: string;
}

export function useRoleAssignments(objectType: 'folder' | 'document', objectId: string | null | undefined) {
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAssignments = useCallback(async () => {
    if (!objectId) {
      setAssignments([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/permissions/roles?object=${objectType}:${objectId}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching role assignments:', error);
    } finally {
      setLoading(false);
    }
  }, [objectType, objectId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const assignRole = async (user: string, relation: string) => {
    if (!objectId) return;
    try {
      const res = await fetch('/api/permissions/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, relation, object: `${objectType}:${objectId}` }),
      });
      if (res.ok) {
        await fetchAssignments();
      }
    } catch (error) {
      console.error('Error assigning role:', error);
    }
  };

  const removeRole = async (user: string, relation: string) => {
    if (!objectId) return;
    try {
      const res = await fetch('/api/permissions/roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, relation, object: `${objectType}:${objectId}` }),
      });
      if (res.ok) {
        await fetchAssignments();
      }
    } catch (error) {
      console.error('Error removing role:', error);
    }
  };

  return { assignments, loading, refetch: fetchAssignments, assignRole, removeRole };
}
