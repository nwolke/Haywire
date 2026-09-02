import { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { NPC, Relationship } from "@/types/npc";
import { PC } from "@/types/pc";
import { Organization } from "@/types/organization";
import { EntityItem, EntityType } from "@/types/entity";
import { useNPCData } from "@/hooks/useNPCData";
import { usePCData } from "@/hooks/usePCData";
import { useOrganizationData } from "@/hooks/useOrganizationData";
import { useCampaignData } from "@/hooks/useCampaignData";
import { EntityGraph } from "@/app/components/EntityGraph";
import { GraphLegend } from "@/app/components/GraphLegend";
import { EntityDetailPanel } from "@/app/components/EntityDetailPanel";
import { NPCForm } from "@/app/components/NPCForm";
import { PCForm } from "@/app/components/PCForm";
import { OrganizationForm } from "@/app/components/OrganizationForm";
import { Header } from "@/app/components/Header";
import { CampaignAnalyticsPanel } from "@/app/components/CampaignAnalyticsPanel";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  RefreshCw,
  LogIn,
  Search,
  Shield,
  User,
  Building2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { VisualizationProvider, useVisualization } from "@/contexts/VisualizationContext";
import { FALLBACK_RELATIONSHIP_METADATA, listKnownRelationshipTypes, MEMBERSHIP_METADATA } from "@/domain/relationshipMetadata";
import { deriveExplicitMemberships } from "@/domain/visualizationSelectors";
import { resolveMemberships } from "@/domain/membershipPrecedence";

const relationshipLegend: { type: string; color: string; label: string }[] = [
  ...listKnownRelationshipTypes().map(entry => ({ type: entry.type, color: entry.color, label: entry.label })),
  { type: MEMBERSHIP_METADATA.type, color: MEMBERSHIP_METADATA.color, label: MEMBERSHIP_METADATA.label },
  { type: FALLBACK_RELATIONSHIP_METADATA.type, color: FALLBACK_RELATIONSHIP_METADATA.color, label: FALLBACK_RELATIONSHIP_METADATA.label },
];

// Reserve distinct client-only ID bands for derived data:
// - organizations start at -1,000,000
// - membership relationships start at -2,000,000
// This keeps them far away from backend-generated positive IDs and from each other.
const SYNTHETIC_ORGANIZATION_ID_BASE = -1_000_000;
const SYNTHETIC_MEMBERSHIP_RELATIONSHIP_ID_BASE = -2_000_000;

/**
 * Wrapper component that provides visualization state management for the campaign page.
 * Story 2.1: Extract Visualization State Hook and Provider
 */
export function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = id ? Number(id) : undefined;

  // Wrap the actual content with the visualization provider
  return (
    <VisualizationProvider campaignId={campaignId}>
      <CampaignPageContent campaignId={campaignId} />
    </VisualizationProvider>
  );
}

/**
 * Core campaign page content that uses visualization state management.
 * This component acts as a layout and composition shell, delegating
 * transient visual state to the VisualizationContext.
 */
function CampaignPageContent({ campaignId }: { campaignId: number | undefined }) {
  const { isAuthenticated, loginWithCognito, loading: authLoading } = useAuth();

  // Fetch campaign info for breadcrumb
  const { campaigns } = useCampaignData();
  const campaign = campaigns.find(c => c.id === campaignId);

  // Consume visualization state from context
  const visualization = useVisualization();

  // Data hooks scoped to this campaign
  const {
    npcs,
    relationships,
    loading: npcLoading,
    error: npcError,
    refreshNpcs,
    saveNPC,
    deleteNPC,
    addRelationship,
    deleteRelationship,
    updateRelationship,
  } = useNPCData(campaignId);

  const {
    pcs,
    loading: pcLoading,
    error: pcError,
    refreshPcs,
    savePc,
    deletePc,
  } = usePCData(campaignId);

  const {
    organizations,
    loading: organizationLoading,
    error: organizationError,
    refreshOrganizations,
    saveOrganization,
    deleteOrganization,
  } = useOrganizationData();

  const loading = npcLoading || pcLoading || organizationLoading;
  const error = [npcError, pcError, organizationError].filter(Boolean).join('; ') || null;

  const organizationEntities = useMemo<EntityItem[]>(() => {
    const factionNamesByKey = new Map<string, string>();
    npcs.forEach(npc => {
      const factionName = npc.faction?.trim();
      if (!factionName) {
        return;
      }

      const factionKey = factionName.toLowerCase();
      if (!factionNamesByKey.has(factionKey)) {
        factionNamesByKey.set(factionKey, factionName);
      }
    });

    const relationshipOrganizationIds = new Set<number>();
    relationships.forEach(rel => {
      if (rel.entityType1 === 'organization') {
        relationshipOrganizationIds.add(rel.npcId1);
      }
      if (rel.entityType2 === 'organization') {
        relationshipOrganizationIds.add(rel.npcId2);
      }
    });

    const matchedFactionKeys = new Set<string>();
    const realOrganizations = organizations
      .filter(org => {
        const key = org.name.trim().toLowerCase();
        const matchesFaction = factionNamesByKey.has(key);
        if (matchesFaction) {
          matchedFactionKeys.add(key);
        }

        return matchesFaction || relationshipOrganizationIds.has(org.id);
      })
      .map((organization): EntityItem => ({
        id: organization.id,
        name: organization.name,
        entityType: 'organization',
        description: organization.description,
      }));

    const fallbackOrganizations = Array.from(factionNamesByKey.values())
      .filter(name => !matchedFactionKeys.has(name.toLowerCase()))
      .map((name, index): EntityItem => ({
        id: SYNTHETIC_ORGANIZATION_ID_BASE - index,
        name,
        entityType: 'organization',
        isSynthetic: true,
      }));

    return [...realOrganizations, ...fallbackOrganizations];
  }, [npcs, organizations, relationships]);

  const organizationEntityByName = useMemo(() => new Map(
    organizationEntities.map(organization => [organization.name.trim().toLowerCase(), organization]),
  ), [organizationEntities]);

  const organizationMembershipRelationships = useMemo<Relationship[]>(() => {
    // Delegate precedence resolution (explicit relationship membership takes
    // priority over legacy faction-text membership) to the shared domain
    // layer (see src/domain/membershipPrecedence.ts) so this logic isn't
    // duplicated across pages/components.
    const explicitMemberships = deriveExplicitMemberships(relationships);
    const memberships = resolveMemberships(explicitMemberships, npcs, organizationEntityByName);

    return memberships
      .filter((membership): membership is typeof membership & { source: 'inferred' } => membership.source === 'inferred')
      .map((membership, index) => {
        const npc = npcs.find(n => n.id === membership.member.id);
        return {
          id: SYNTHETIC_MEMBERSHIP_RELATIONSHIP_ID_BASE - index,
          npcId1: membership.member.id,
          npcId2: membership.organization.id,
          entityType1: membership.member.entityType,
          entityType2: membership.organization.entityType,
          type: 'member',
          description: membership.description,
          attitudeScore: 0,
          campaignId: npc?.campaignId,
          isDerived: true,
        };
      });
  }, [npcs, organizationEntityByName, relationships]);

  const allRelationships = useMemo(
    () => [...relationships, ...organizationMembershipRelationships],
    [organizationMembershipRelationships, relationships],
  );

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
      campaignId: pc.campaignId,
    })),
    ...organizationEntities,
  ], [npcs, pcs, organizationEntities]);

  // Extract visualization state from context
  const { state: vizState } = visualization;

  // Derive showNPCs, showPCs, showOrganizations from filters
  const showNPCs = vizState.filters.entityTypes.includes('npc');
  const showPCs = vizState.filters.entityTypes.includes('pc');
  const showOrganizations = vizState.filters.entityTypes.includes('organization');

  // Map activeView from visualization state (was activeCenterTab in old code)
  const activeCenterTab = vizState.activeView;

  // Resolve selectedEntity from visualization state
  const selectedEntity = useMemo(
    () => vizState.selectedEntity
      ? entities.find(entity => (
        entity.id === vizState.selectedEntity!.id &&
        entity.entityType === vizState.selectedEntity!.entityType
      )) ?? null
      : null,
    [entities, vizState.selectedEntity],
  );

  // NPC form state
  const [npcFormOpen, setNpcFormOpen] = useState(false);
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null);

  // PC form state
  const [pcFormOpen, setPcFormOpen] = useState(false);
  const [editingPC, setEditingPC] = useState<PC | null>(null);

  // Organization form state
  const [orgFormOpen, setOrgFormOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // Canvas sizing
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const updateCanvasSize = useCallback((width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
  }, []);

  useEffect(() => {
    const container = canvasContainerRef.current;
    let observer: ResizeObserver | null = null;

    if (activeCenterTab === "graph" && container) {
      const rect = container.getBoundingClientRect();
      updateCanvasSize(rect.width, rect.height);

      observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          updateCanvasSize(width, height);
        }
      });
      observer.observe(container);
    }

    return () => observer?.disconnect();
  }, [activeCenterTab, updateCanvasSize]);

  // Filter entities based on visualization state
  const filteredEntities = entities.filter(e => {
    if (e.entityType === 'npc' && !showNPCs) return false;
    if (e.entityType === 'pc' && !showPCs) return false;
    if (e.entityType === 'organization' && !showOrganizations) return false;
    if (vizState.search.trim()) {
      return e.name.toLowerCase().includes(vizState.search.toLowerCase());
    }
    return true;
  });

  // Filter relationships to visible entities
  const visibleEntityKeys = new Set(filteredEntities.map(e => `${e.entityType}-${e.id}`));
  const filteredRelationships = allRelationships.filter(rel => {
    const k1 = `${rel.entityType1}-${rel.npcId1}`;
    const k2 = `${rel.entityType2}-${rel.npcId2}`;
    return visibleEntityKeys.has(k1) && visibleEntityKeys.has(k2);
  });

  const handleRefresh = async () => {
    await Promise.all([refreshNpcs(), refreshPcs(), refreshOrganizations()]);
  };

  // NPC CRUD handlers
  const handleAddNPC = () => {
    setEditingNPC(null);
    setNpcFormOpen(true);
  };

  const handleEditNPC = (npc: NPC) => {
    setEditingNPC(npc);
    setNpcFormOpen(true);
  };

  const handleDeleteNPC = async (id: number) => {
    if (confirm('Are you sure you want to delete this NPC? All their relationships will also be removed.')) {
      await deleteNPC(id);
      if (selectedEntity?.entityType === 'npc' && selectedEntity?.id === id) {
        visualization.clearSelectedEntity();
      }
    }
  };

  // PC CRUD handlers
  const handleAddPC = () => {
    setEditingPC(null);
    setPcFormOpen(true);
  };

  const handleEditPC = (pc: PC) => {
    setEditingPC(pc);
    setPcFormOpen(true);
  };

  const handleDeletePC = async (id: number) => {
    if (confirm('Are you sure you want to delete this character?')) {
      await deletePc(id);
      if (selectedEntity?.entityType === 'pc' && selectedEntity?.id === id) {
        visualization.clearSelectedEntity();
      }
    }
  };

  const handleSaveNPC = useCallback(async (npcData: Omit<NPC, 'id'> | NPC) => {
    await saveNPC(npcData);
    await refreshOrganizations();
  }, [refreshOrganizations, saveNPC]);

  // Organization CRUD handlers
  const handleAddOrg = () => {
    setEditingOrg(null);
    setOrgFormOpen(true);
  };

  const handleEditOrg = (org: Organization) => {
    setEditingOrg(org);
    setOrgFormOpen(true);
  };

  const handleDeleteOrg = async (id: number) => {
    if (confirm('Are you sure you want to delete this organization?')) {
      await deleteOrganization(id);
      if (selectedEntity?.entityType === 'organization' && selectedEntity?.id === id) {
        visualization.clearSelectedEntity();
      }
    }
  };

  // Handle edit/delete from the detail panel
  const handleEditEntity = () => {
    if (!selectedEntity) return;
    if (selectedEntity.entityType === 'npc') {
      const npc = npcs.find(n => n.id === selectedEntity.id);
      if (npc) handleEditNPC(npc);
    } else if (selectedEntity.entityType === 'pc') {
      const pc = pcs.find(p => p.id === selectedEntity.id);
      if (pc) handleEditPC(pc);
    } else if (selectedEntity.entityType === 'organization') {
      const org = organizations.find(o => o.id === selectedEntity.id);
      if (org) handleEditOrg(org);
    }
  };

  const handleDeleteEntity = () => {
    if (!selectedEntity) return;
    if (selectedEntity.entityType === 'npc') {
      handleDeleteNPC(selectedEntity.id);
    } else if (selectedEntity.entityType === 'pc') {
      handleDeletePC(selectedEntity.id);
    } else if (selectedEntity.entityType === 'organization') {
      handleDeleteOrg(selectedEntity.id);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="size-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!campaignId) {
    return <Navigate to="/relationship-manager" replace />;
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-background via-background to-secondary/20 flex flex-col">
      {/* Decorative background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="container mx-auto py-8 px-4 relative flex flex-col flex-1 min-h-0">
        <Header
          breadcrumbs={[
            { label: "Relationship Manager", to: "/relationship-manager" },
            { label: campaign?.name || "Campaign" },
          ]}
        />

        {/* Top controls bar */}
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {campaign?.name || "Campaign"}
          </h2>

          <div className="flex items-center gap-3 flex-wrap">
            {error && (
              <span className="text-sm text-destructive">{error}</span>
            )}
            {loading && (
              <RefreshCw className="size-4 animate-spin text-muted-foreground" />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {/* Entity type toggles */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={showNPCs ? "default" : "outline"}
                onClick={() => {
                  const newTypes = showNPCs
                    ? vizState.filters.entityTypes.filter(t => t !== 'npc')
                    : [...vizState.filters.entityTypes, 'npc' as EntityType];
                  visualization.updateFilters({ entityTypes: newTypes });
                }}
                className={showNPCs
                  ? "bg-primary/80 hover:bg-primary/70 text-primary-foreground"
                  : "border-primary/30 text-primary hover:bg-primary/10"
                }
              >
                <Shield className="size-3 mr-1" />
                NPCs
              </Button>
              <Button
                size="sm"
                variant={showPCs ? "default" : "outline"}
                onClick={() => {
                  const newTypes = showPCs
                    ? vizState.filters.entityTypes.filter(t => t !== 'pc')
                    : [...vizState.filters.entityTypes, 'pc' as EntityType];
                  visualization.updateFilters({ entityTypes: newTypes });
                }}
                className={showPCs
                  ? "bg-green-600/80 hover:bg-green-600/70 text-white"
                  : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                }
              >
                <User className="size-3 mr-1" />
                PCs
              </Button>
              <Button
                size="sm"
                variant={showOrganizations ? "default" : "outline"}
                onClick={() => {
                  const newTypes = showOrganizations
                    ? vizState.filters.entityTypes.filter(t => t !== 'organization')
                    : [...vizState.filters.entityTypes, 'organization' as EntityType];
                  visualization.updateFilters({ entityTypes: newTypes });
                }}
                className={showOrganizations
                  ? "bg-sky-600/80 hover:bg-sky-600/70 text-white"
                  : "border-sky-500/30 text-sky-300 hover:bg-sky-500/10"
                }
              >
                <Building2 className="size-3 mr-1" />
                Orgs
              </Button>
            </div>
          </div>
        </div>

        {/* Main 3-column layout */}
        {!isAuthenticated ? (
          <div className="text-center py-20">
            <div className="bg-gradient-to-br from-card to-secondary/30 border border-primary/30 rounded-2xl p-12 max-w-md mx-auto shadow-xl">
              <div className="bg-gradient-to-br from-primary/20 to-accent/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <LogIn className="size-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-primary">Sign In Required</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Sign in to view and manage this campaign
              </p>
              <Button
                onClick={loginWithCognito}
                size="lg"
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg"
              >
                <LogIn className="size-4 mr-2" />
                Sign In
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* LEFT SIDEBAR — entity list */}
            <div className="w-56 shrink-0 flex flex-col bg-card/50 border border-primary/20 rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-primary/20">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={vizState.search}
                    onChange={e => visualization.setSearch(e.target.value)}
                    placeholder="Search..."
                    className="pl-8 h-8 text-sm bg-background/50 border-primary/20"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-0.5">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="size-5 animate-spin text-primary" />
                    </div>
                  ) : filteredEntities.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6 px-2">
                      {vizState.search ? 'No entities match your search.' : 'No entities yet. Add NPCs, PCs, or factions to get started.'}
                    </p>
                  ) : (
                    filteredEntities.map(entity => {
                      const isSelected =
                        selectedEntity?.id === entity.id &&
                        selectedEntity?.entityType === entity.entityType;
                      const isNpc = entity.entityType === 'npc';
                      const isOrganization = entity.entityType === 'organization';
                      return (
                        <button
                          key={`${entity.entityType}-${entity.id}`}
                          onClick={() => {
                            if (isSelected) {
                              visualization.clearSelectedEntity();
                            } else {
                              visualization.setSelectedEntity(entity.id, entity.entityType);
                            }
                          }}
                          className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                            isSelected
                              ? 'bg-primary/20 text-primary'
                              : 'hover:bg-primary/10 text-foreground'
                          }`}
                        >
                          {isNpc ? (
                            <Shield className={`size-3.5 shrink-0 ${isSelected ? 'text-primary' : 'text-primary/60'}`} />
                          ) : isOrganization ? (
                            <Building2 className={`size-3.5 shrink-0 ${isSelected ? 'text-sky-300' : 'text-sky-300/60'}`} />
                          ) : (
                            <User className={`size-3.5 shrink-0 ${isSelected ? 'text-green-400' : 'text-green-400/60'}`} />
                          )}
                          <span className="truncate">{entity.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Add buttons + counts */}
              <div className="p-2 border-t border-primary/20 space-y-2">
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddNPC}
                    className="flex-1 h-7 text-xs border-primary/30 hover:bg-primary/10"
                  >
                    <Plus className="size-3 mr-1" />
                    NPC
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddPC}
                    className="flex-1 h-7 text-xs border-green-500/30 hover:bg-green-500/10 text-green-400"
                  >
                    <Plus className="size-3 mr-1" />
                    PC
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddOrg}
                    className="flex-1 h-7 text-xs border-sky-500/30 hover:bg-sky-500/10 text-sky-300"
                  >
                    <Plus className="size-3 mr-1" />
                    Org
                  </Button>
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground px-1">
                  <span>{npcs.length} NPCs</span>
                  <span>·</span>
                  <span>{pcs.length} PCs</span>
                  <span>·</span>
                  <span>{organizationEntities.length} Orgs</span>
                </div>
              </div>
            </div>

            {/* CENTER — graph / analytics */}
            <div className="flex-1 flex flex-col min-w-0 gap-2">
              <Tabs
                value={activeCenterTab}
                onValueChange={(value) => visualization.setActiveView(value as any)}
                className="flex-1 min-h-0"
              >
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="graph">Graph View</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="graph" className="flex-1 min-h-0 flex flex-col gap-2">
                  <div ref={canvasContainerRef} className="flex-1 min-h-0 overflow-hidden">
                    <EntityGraph
                      entities={filteredEntities}
                      relationships={filteredRelationships}
                      selectedEntityId={selectedEntity?.id}
                      selectedEntityType={selectedEntity?.entityType}
                      onNodeClick={entity => {
                        if (selectedEntity?.id === entity.id && selectedEntity?.entityType === entity.entityType) {
                          visualization.clearSelectedEntity();
                        } else {
                          visualization.setSelectedEntity(entity.id, entity.entityType);
                        }
                      }}
                      width={canvasSize.width}
                      height={canvasSize.height}
                    />
                  </div>

                  {/* Legend */}
                  <GraphLegend items={relationshipLegend} />
                </TabsContent>

                <TabsContent value="analytics" className="flex-1 min-h-0">
                  <CampaignAnalyticsPanel
                    npcs={npcs}
                    pcs={pcs}
                    organizations={organizationEntities}
                    relationships={allRelationships}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* RIGHT SIDEBAR — entity detail + actions */}
            <div className="w-72 shrink-0 bg-card/50 border border-primary/20 rounded-2xl overflow-hidden flex flex-col min-h-0">
              <div className="flex-1 min-h-0">
                <EntityDetailPanel
                  entity={selectedEntity}
                  relationships={allRelationships}
                  allEntities={entities}
                  onAddRelationship={addRelationship}
                  onDeleteRelationship={deleteRelationship}
                  onUpdateRelationship={updateRelationship}
                />
              </div>
              {/* Edit/Delete actions for selected entity */}
              {selectedEntity && !(selectedEntity.entityType === 'organization' && selectedEntity.isSynthetic) && (
                <div className="p-3 border-t border-primary/20 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEditEntity}
                    className="flex-1 hover:bg-primary/10 hover:border-primary/50"
                  >
                    <Pencil className="size-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDeleteEntity}
                    className="hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
                    aria-label="Delete entity"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Form Modals */}
      {Number.isFinite(campaignId) && (
        <NPCForm
          open={npcFormOpen}
          onOpenChange={setNpcFormOpen}
          onSave={handleSaveNPC}
          editingNPC={editingNPC}
          campaignId={campaignId as number}
        />
      )}
      {Number.isFinite(campaignId) && (
        <PCForm
          open={pcFormOpen}
          onOpenChange={setPcFormOpen}
          onSave={savePc}
          editingPC={editingPC}
          campaignId={campaignId as number}
        />
      )}
      <OrganizationForm
        open={orgFormOpen}
        onOpenChange={setOrgFormOpen}
        onSave={saveOrganization}
        editingOrganization={editingOrg}
      />
    </div>
  );
}
