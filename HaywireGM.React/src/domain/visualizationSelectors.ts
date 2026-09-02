import type { NPC, Relationship } from '@/types/npc';
import type { EntityItem } from '@/types/entity';
import type {
  AggregateEdge,
  AggregatedRelationshipDetail,
  EntityRef,
  MembershipRecord,
  RelationshipFilterCriteria,
  VisualizationNode,
  VisualizationRelationship,
  VisualizationViewModel,
} from '@/types/visualization';
import { toEntityKey } from '@/types/visualization';
import { getRelationshipCategory } from '@/domain/relationshipMetadata';
import { resolveMemberships, type ExplicitMembershipInput } from '@/domain/membershipPrecedence';

/**
 * Pure campaign visualization selectors (Story 1.3).
 *
 * These functions decouple business/visual transformation logic from React
 * render lifecycles: given raw campaign entities/relationships, they
 * produce a normalized, view-ready dataset that Graph, Matrix, and
 * Hierarchy views can all consume identically.
 */

/** Normalize a relationship DTO endpoint pair into canonical `EntityRef`s. Backward-compatible boundary from `npcId1`/`npcId2`. */
export function toRelationshipEndpoints(relationship: Relationship): { source: EntityRef; target: EntityRef } {
  return {
    source: { entityType: relationship.entityType1, id: relationship.npcId1 },
    target: { entityType: relationship.entityType2, id: relationship.npcId2 },
  };
}

/** Whether a raw relationship represents organization membership rather than a standard social relationship. */
export function isMembershipRelationship(relationship: Relationship): boolean {
  return relationship.entityType1 === 'organization' || relationship.entityType2 === 'organization';
}

/** Convert raw API relationships into canonical, typed visualization relationships. */
export function normalizeRelationships(relationships: Relationship[]): VisualizationRelationship[] {
  return relationships.map(relationship => {
    const { source, target } = toRelationshipEndpoints(relationship);
    return {
      id: relationship.id,
      source,
      target,
      type: relationship.type,
      category: getRelationshipCategory(relationship.type),
      description: relationship.description,
      attitudeScore: relationship.attitudeScore ?? 0,
      isDerived: relationship.isDerived,
    };
  });
}

/** Standard social relationship edges exclude membership relationships by default (Story 1.3). */
export function selectSocialRelationships(relationships: Relationship[]): Relationship[] {
  return relationships.filter(relationship => !isMembershipRelationship(relationship));
}

/**
 * Derive explicit membership inputs from raw relationships where one side
 * is an organization. Handles both endpoint orderings.
 */
export function deriveExplicitMemberships(relationships: Relationship[]): ExplicitMembershipInput[] {
  const explicit: ExplicitMembershipInput[] = [];

  for (const relationship of relationships) {
    const isOrg1 = relationship.entityType1 === 'organization';
    const isOrg2 = relationship.entityType2 === 'organization';
    if (!isOrg1 && !isOrg2) {
      continue;
    }
    // If both sides are organizations, there is no member to attribute; skip.
    if (isOrg1 && isOrg2) {
      continue;
    }

    const organization: EntityRef = isOrg1
      ? { entityType: 'organization', id: relationship.npcId1 }
      : { entityType: 'organization', id: relationship.npcId2 };
    const member: EntityRef = isOrg1
      ? { entityType: relationship.entityType2, id: relationship.npcId2 }
      : { entityType: relationship.entityType1, id: relationship.npcId1 };

    explicit.push({
      relationshipId: relationship.id,
      member,
      organization,
      description: relationship.description,
    });
  }

  return explicit;
}

/** Build a lowercase-name lookup of organization entities, used for legacy faction-text resolution. */
export function buildOrganizationNameLookup(organizations: EntityItem[]): Map<string, EntityItem> {
  return new Map(organizations.map(organization => [organization.name.trim().toLowerCase(), organization]));
}

/**
 * Resolve the canonical membership list for a campaign, applying
 * explicit-over-inferred precedence (Story 1.4).
 */
export function selectMemberships(
  relationships: Relationship[],
  npcs: NPC[],
  organizations: EntityItem[],
): MembershipRecord[] {
  const explicit = deriveExplicitMemberships(relationships);
  const organizationsByName = buildOrganizationNameLookup(organizations);
  return resolveMemberships(explicit, npcs, organizationsByName);
}

/** Aggregation rule for combining multiple attitude scores into a single edge value: use the value with the greatest magnitude, preferring negative on ties (documented in Story 3.5 AC). */
export function aggregateAttitudeScore(scores: number[]): number {
  if (scores.length === 0) {
    return 0;
  }

  return scores.reduce((selected, current) => {
    const selectedMagnitude = Math.abs(selected);
    const currentMagnitude = Math.abs(current);
    if (currentMagnitude > selectedMagnitude) {
      return current;
    }
    if (currentMagnitude === selectedMagnitude && current < selected) {
      return current;
    }
    return selected;
  }, scores[0]);
}

function unorderedPairKey(a: EntityRef, b: EntityRef): string {
  const keyA = toEntityKey(a);
  const keyB = toEntityKey(b);
  return keyA <= keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
}

/**
 * Aggregate parallel, non-membership relationships between the same
 * unordered entity pair into a single stacked edge (Story 3.5). Preserves
 * every underlying relationship id, type, description, and attitude value.
 */
export function aggregateEdges(relationships: VisualizationRelationship[]): AggregateEdge[] {
  const groups = new Map<string, { source: EntityRef; target: EntityRef; details: AggregatedRelationshipDetail[] }>();

  for (const relationship of relationships) {
    const key = unorderedPairKey(relationship.source, relationship.target);
    let group = groups.get(key);
    if (!group) {
      group = { source: relationship.source, target: relationship.target, details: [] };
      groups.set(key, group);
    }

    group.details.push({
      relationshipId: relationship.id,
      type: relationship.type,
      category: relationship.category,
      description: relationship.description,
      attitudeScore: relationship.attitudeScore,
    });
  }

  return Array.from(groups.values()).map(group => ({
    source: group.source,
    target: group.target,
    relationships: group.details,
    attitudeScore: aggregateAttitudeScore(group.details.map(detail => detail.attitudeScore)),
    categories: Array.from(new Set(group.details.map(detail => detail.category))),
  }));
}

function entitySubtitle(entity: EntityItem): string | undefined {
  if (entity.entityType === 'npc') {
    return [entity.lineage, entity.class].filter(Boolean).join(' • ') || undefined;
  }
  if (entity.entityType === 'pc') {
    return 'Player Character';
  }
  return 'Organization';
}

/** Normalize raw entities into view-ready visualization nodes, attaching resolved memberships. */
export function normalizeEntities(entities: EntityItem[], memberships: MembershipRecord[]): VisualizationNode[] {
  const membershipsByMember = new Map<string, MembershipRecord[]>();
  for (const membership of memberships) {
    const key = toEntityKey(membership.member);
    const list = membershipsByMember.get(key) ?? [];
    list.push(membership);
    membershipsByMember.set(key, list);
  }

  return entities.map(entity => {
    const ref: EntityRef = { entityType: entity.entityType, id: entity.id };
    return {
      ref,
      name: entity.name,
      subtitle: entitySubtitle(entity),
      memberships: membershipsByMember.get(toEntityKey(ref)) ?? [],
      isSynthetic: entity.isSynthetic,
    };
  });
}

/**
 * Filter raw relationships according to view filter criteria. Membership
 * relationships are excluded from the `relationshipTypes`/`categories`
 * filters entirely, since they are represented separately as badges.
 */
export function filterRelationships(
  relationships: VisualizationRelationship[],
  criteria: RelationshipFilterCriteria,
): VisualizationRelationship[] {
  return relationships.filter(relationship => {
    if (criteria.relationshipTypes.length > 0 && !criteria.relationshipTypes.includes(relationship.type)) {
      return false;
    }
    if (criteria.categories.length > 0 && !criteria.categories.includes(relationship.category)) {
      return false;
    }
    return true;
  });
}

/** Filter entities by allowed entity types. Dangling references are simply excluded, never thrown. */
export function filterEntitiesByType(entities: EntityItem[], criteria: RelationshipFilterCriteria): EntityItem[] {
  if (criteria.entityTypes.length === 0) {
    return [];
  }
  return entities.filter(entity => criteria.entityTypes.includes(entity.entityType));
}

/**
 * Build a complete, view-ready visualization dataset from raw campaign
 * entities and relationships. Handles dangling/missing relationship
 * endpoints gracefully by dropping edges that reference entities absent
 * from the provided entity list, rather than throwing or rendering broken
 * links.
 */
export function buildVisualizationViewModel(
  entities: EntityItem[],
  npcs: NPC[],
  organizations: EntityItem[],
  relationships: Relationship[],
  criteria: RelationshipFilterCriteria,
): VisualizationViewModel {
  const filteredEntities = filterEntitiesByType(entities, criteria);
  const knownKeys = new Set(filteredEntities.map(entity => toEntityKey({ entityType: entity.entityType, id: entity.id })));

  const memberships = selectMemberships(relationships, npcs, organizations)
    .filter(membership => criteria.includeInferredMemberships || membership.source === 'explicit')
    .filter(membership => knownKeys.has(toEntityKey(membership.member)) && knownKeys.has(toEntityKey(membership.organization)));

  const socialRelationships = selectSocialRelationships(relationships);
  const normalizedSocial = normalizeRelationships(socialRelationships).filter(
    relationship => knownKeys.has(toEntityKey(relationship.source)) && knownKeys.has(toEntityKey(relationship.target)),
  );
  const filteredSocial = filterRelationships(normalizedSocial, criteria);
  const edges = aggregateEdges(filteredSocial);

  const nodes = normalizeEntities(filteredEntities, memberships);

  const connectedKeys = new Set<string>();
  edges.forEach(edge => {
    connectedKeys.add(toEntityKey(edge.source));
    connectedKeys.add(toEntityKey(edge.target));
  });
  memberships.forEach(membership => {
    connectedKeys.add(toEntityKey(membership.member));
    connectedKeys.add(toEntityKey(membership.organization));
  });

  const visibleNodes = criteria.includeIsolatedEntities
    ? nodes
    : nodes.filter(node => connectedKeys.has(toEntityKey(node.ref)));

  return { nodes: visibleNodes, edges, memberships };
}
