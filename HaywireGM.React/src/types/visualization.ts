import type { EntityType } from '@/types/entity';

/**
 * Canonical visualization domain types (Story 1.1).
 *
 * These types establish a typed model for the relationship visualization
 * layer so that visual components (graph, matrix, hierarchy, legends,
 * filters) no longer need to independently interpret ambiguous,
 * NPC-specific DTO fields such as `npcId1`/`npcId2`.
 *
 * Transformations from existing API DTOs (see `src/types/npc.ts`) into
 * these types must remain strictly backward-compatible at the boundary -
 * no API contract changes are required or made here.
 */

/** A typed reference to any visualizable entity (NPC, PC, or Organization). */
export interface EntityRef {
  entityType: EntityType;
  id: number;
}

/** Canonical string key for an entity, e.g. `"npc:42"`. Safe for use as a Map/Set key or graph node id. */
export type EntityKey = `${EntityType}:${number}`;

export function toEntityKey(ref: EntityRef): EntityKey {
  return `${ref.entityType}:${ref.id}`;
}

export function entityRefEquals(a: EntityRef, b: EntityRef): boolean {
  return a.entityType === b.entityType && a.id === b.id;
}

/**
 * Broad category classification for a relationship type. Used to drive
 * consistent styling and filtering across all visualization surfaces.
 */
export type RelationshipCategory =
  | 'positive'
  | 'negative'
  | 'professional'
  | 'familial'
  | 'membership'
  | 'neutral';

/** Source of truth for how a membership was established. */
export type MembershipSource = 'explicit' | 'inferred';

/**
 * A single relationship endpoint pair, using neutral `source`/`target`
 * naming rather than NPC-specific property names.
 */
export interface RelationshipEndpoints {
  source: EntityRef;
  target: EntityRef;
}

/**
 * A normalized, canonical relationship edge derived from the API's
 * `Relationship` DTO. Organization membership relationships are still
 * representable here, but are additionally surfaced as `MembershipRecord`s
 * (see below) so that consumers can treat containment separately from
 * peer-to-peer social relationships.
 */
export interface VisualizationRelationship extends RelationshipEndpoints {
  id: number;
  type: string;
  category: RelationshipCategory;
  description?: string;
  attitudeScore: number;
  isDerived?: boolean;
}

/**
 * Organization membership, modeled as a distinct record type separate from
 * standard social relationships (Story 1.1 / Story 1.4).
 */
export interface MembershipRecord {
  member: EntityRef;
  organization: EntityRef;
  /** Whether this membership comes from an explicit relationship record or is inferred from legacy free-text faction data. */
  source: MembershipSource;
  /** The underlying relationship id when `source === 'explicit'`. */
  relationshipId?: number;
  description?: string;
}

/** A single underlying relationship folded into an aggregate edge. */
export interface AggregatedRelationshipDetail {
  relationshipId: number;
  type: string;
  category: RelationshipCategory;
  description?: string;
  attitudeScore: number;
}

/**
 * A single visual edge representing all non-membership relationships
 * between the same unordered pair of entities (Story 3.5). Preserves every
 * underlying relationship id, type, description, and attitude value.
 */
export interface AggregateEdge {
  source: EntityRef;
  target: EntityRef;
  relationships: AggregatedRelationshipDetail[];
  /** Aggregated attitude used for edge styling (see `aggregateAttitudeScore`). */
  attitudeScore: number;
  categories: RelationshipCategory[];
}

/** A visualization-ready node, decorated with derived membership badges. */
export interface VisualizationNode {
  ref: EntityRef;
  name: string;
  subtitle?: string;
  memberships: MembershipRecord[];
  isSynthetic?: boolean;
}

export type RelationshipPerspective = 'all' | 'pc' | 'npc' | 'organization';

/**
 * Filter criteria applied when producing a view-ready dataset for the
 * graph, matrix, and hierarchy views (Story 2.2).
 */
export interface RelationshipFilterCriteria {
  entityTypes: EntityType[];
  relationshipTypes: string[];
  categories: RelationshipCategory[];
  perspective: RelationshipPerspective;
  includeInferredMemberships: boolean;
  includeIsolatedEntities: boolean;
}

export function createDefaultFilterCriteria(): RelationshipFilterCriteria {
  return {
    entityTypes: ['npc', 'pc', 'organization'],
    relationshipTypes: [],
    categories: [],
    perspective: 'all',
    includeInferredMemberships: true,
    includeIsolatedEntities: true,
  };
}

/** Named semantic zoom tiers (Story 4.1). */
export type ZoomTier = 'overview' | 'mid-detail' | 'detail';

/** Available top-level visualization view modes (Story 5.3). */
export type ViewMode = 'graph' | 'matrix' | 'hierarchy' | 'analytics';

/** A fully prepared, view-ready dataset consumed by any visualization surface. */
export interface VisualizationViewModel {
  nodes: VisualizationNode[];
  edges: AggregateEdge[];
  memberships: MembershipRecord[];
}
