import { useState, useEffect, useCallback } from 'react';
import { Organization } from '@/types/organization';
import { organizationApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface UseOrganizationDataReturn {
  organizations: Organization[];
  loading: boolean;
  error: string | null;
  refreshOrganizations: () => Promise<void>;
  saveOrganization: (org: Omit<Organization, 'id'> | Organization) => Promise<void>;
  deleteOrganization: (id: number) => Promise<void>;
}

export function useOrganizationData(): UseOrganizationDataReturn {
  const { isAuthenticated } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const apiOrganizations = await organizationApi.getOrganizations();
      setOrganizations(apiOrganizations);
    } catch (err: unknown) {
      console.error('[useOrganizationData] Failed to load organizations:', err);
      setError('Failed to load organizations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrganizations();
    } else {
      setOrganizations([]);
      setLoading(false);
    }
  }, [isAuthenticated, loadOrganizations]);

  const refreshOrganizations = useCallback(async () => {
    await loadOrganizations();
  }, [loadOrganizations]);

  const saveOrganization = useCallback(async (org: Omit<Organization, 'id'> | Organization) => {
    if ('id' in org && org.id) {
      await organizationApi.updateOrganization(org.id, { name: org.name, description: org.description });
    } else {
      await organizationApi.createOrganization({ name: org.name, description: org.description });
    }
    await loadOrganizations();
  }, [loadOrganizations]);

  const deleteOrganization = useCallback(async (id: number) => {
    await organizationApi.deleteOrganization(id);
    await loadOrganizations();
  }, [loadOrganizations]);

  return {
    organizations,
    loading,
    error,
    refreshOrganizations,
    saveOrganization,
    deleteOrganization,
  };
}
