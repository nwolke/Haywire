import { useState, useCallback, useMemo } from 'react';
import { NPC, Relationship } from '@/types/npc';
import { PC } from '@/types/pc';
import { useNPCData } from './useNPCData';
import { usePCData } from './usePCData';
import { useOrganizationData } from './useOrganizationData';

// Re-export from canonical location for backward compatibility
export type { EntityType, EntityItem } from '@/types/entity';
import type { EntityItem } from '@/types/entity';

export interface UseRelationshipPageDataReturn {
  npcs: NPC[];
  pcs: PC[];
  organizations: EntityItem[];
  entities: EntityItem[];
  relationships: Relationship[];
  loading: boolean;
  error: string | null;
  selectedCampaignId: number | undefined;
  setSelectedCampaignId: (id: number | undefined) => void;
  refresh: () => Promise<void>;
  addRelationship: (relationship: Omit<Relationship, 'id'>) => Promise<void>;
  deleteRelationship: (id: number) => void;
}

export function useRelationshipPageData(): UseRelationshipPageDataReturn {
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | undefined>(undefined);

  const {
    npcs,
    relationships,
    loading: npcLoading,
    error: npcError,
    refreshNpcs,
    addRelationship: addRelationshipFromNpcHook,
    deleteRelationship,
  } = useNPCData(selectedCampaignId);

  const {
    pcs,
    loading: pcLoading,
    error: pcError,
    refreshPcs,
  } = usePCData(selectedCampaignId);

  const {
    organizations,
    loading: organizationLoading,
    error: organizationError,
    refreshOrganizations,
  } = useOrganizationData();

  const loading = npcLoading || pcLoading || organizationLoading;
  const error = npcError ?? pcError ?? organizationError;

  const entities = useMemo<EntityItem[]>(() => [
    ...npcs.map((npc): EntityItem => ({
      id: npc.id,
      name: npc.name,
      entityType: 'npc',
      lineage: npc.lineage,
      class: npc.class,
      description: npc.description,
      faction: npc.faction,
      notes: npc.notes,
      campaignId: npc.campaignId,
    })),
    ...pcs.map((pc): EntityItem => ({
      id: pc.id,
      name: pc.name,
      entityType: 'pc',
      description: pc.description,
    })),
    ...organizations.map((organization): EntityItem => ({
      id: organization.id,
      name: organization.name,
      entityType: 'organization',
      description: organization.description,
    })),
  ], [npcs, organizations, pcs]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshNpcs(), refreshPcs(), refreshOrganizations()]);
  }, [refreshNpcs, refreshOrganizations, refreshPcs]);

  const addRelationship = useCallback(async (relationship: Omit<Relationship, 'id'>) => {
    await addRelationshipFromNpcHook(relationship);
  }, [addRelationshipFromNpcHook]);

  return {
    npcs,
    pcs,
    organizations: entities.filter(entity => entity.entityType === 'organization'),
    entities,
    relationships,
    loading,
    error,
    selectedCampaignId,
    setSelectedCampaignId,
    refresh,
    addRelationship,
    deleteRelationship,
  };
}
