import { describe, expect, it } from 'vitest';
import type { Relationship, NPC } from '@/types/npc';
import type { EntityItem } from '@/types/entity';
import { createDefaultFilterCriteria } from '@/types/visualization';
import {
  aggregateAttitudeScore,
  aggregateEdges,
  buildVisualizationViewModel,
  isMembershipRelationship,
  normalizeEntities,
  normalizeRelationships,
  selectMemberships,
  selectSocialRelationships,
  toRelationshipEndpoints,
} from './visualizationSelectors';

function makeRelationship(overrides: Partial<Relationship> & { id: number }): Relationship {
  return {
    npcId1: 1,
    npcId2: 2,
    entityType1: 'npc',
    entityType2: 'npc',
    type: 'ally',
    attitudeScore: 0,
    ...overrides,
  };
}

const npcAlice: EntityItem = { id: 1, name: 'Alice', entityType: 'npc' };
const npcBob: EntityItem = { id: 2, name: 'Bob', entityType: 'npc' };
const org: EntityItem = { id: 10, name: 'Guild', entityType: 'organization' };

describe('toRelationshipEndpoints', () => {
  it('maps legacy npcId1/npcId2/entityType fields to neutral source/target refs', () => {
    const rel = makeRelationship({ id: 1, npcId1: 5, npcId2: 6, entityType1: 'npc', entityType2: 'pc' });
    expect(toRelationshipEndpoints(rel)).toEqual({
      source: { entityType: 'npc', id: 5 },
      target: { entityType: 'pc', id: 6 },
    });
  });
});

describe('isMembershipRelationship / selectSocialRelationships', () => {
  it('identifies relationships involving an organization as membership', () => {
    const social = makeRelationship({ id: 1 });
    const membership = makeRelationship({ id: 2, entityType2: 'organization', npcId2: 10 });
    expect(isMembershipRelationship(social)).toBe(false);
    expect(isMembershipRelationship(membership)).toBe(true);

    const filtered = selectSocialRelationships([social, membership]);
    expect(filtered).toEqual([social]);
  });
});

describe('normalizeRelationships', () => {
  it('produces canonical typed relationships with resolved category', () => {
    const rel = makeRelationship({ id: 1, type: 'enemy', attitudeScore: -4 });
    const [normalized] = normalizeRelationships([rel]);
    expect(normalized.category).toBe('negative');
    expect(normalized.source).toEqual({ entityType: 'npc', id: 1 });
    expect(normalized.attitudeScore).toBe(-4);
  });
});

describe('aggregateAttitudeScore', () => {
  it('returns 0 for an empty list', () => {
    expect(aggregateAttitudeScore([])).toBe(0);
  });

  it('selects the value with greatest magnitude', () => {
    expect(aggregateAttitudeScore([1, -3, 2])).toBe(-3);
  });

  it('prefers the negative value on magnitude ties', () => {
    expect(aggregateAttitudeScore([3, -3])).toBe(-3);
  });
});

describe('aggregateEdges', () => {
  it('combines multiple relationships between the same pair into a single stacked edge', () => {
    const relA = makeRelationship({ id: 1, type: 'ally', attitudeScore: 2 });
    const relB = makeRelationship({ id: 2, type: 'rival', attitudeScore: -1 });
    const normalized = normalizeRelationships([relA, relB]);

    const edges = aggregateEdges(normalized);
    expect(edges).toHaveLength(1);
    expect(edges[0].relationships).toHaveLength(2);
    expect(edges[0].relationships.map(r => r.relationshipId)).toEqual([1, 2]);
  });

  it('treats source/target order as the same unordered pair', () => {
    const relA = makeRelationship({ id: 1, npcId1: 1, npcId2: 2 });
    const relB = makeRelationship({ id: 2, npcId1: 2, npcId2: 1 });
    const edges = aggregateEdges(normalizeRelationships([relA, relB]));
    expect(edges).toHaveLength(1);
  });
});

describe('selectMemberships', () => {
  it('derives explicit memberships from organization relationships and excludes them from social edges', () => {
    const membershipRel = makeRelationship({ id: 3, entityType1: 'npc', npcId1: 1, entityType2: 'organization', npcId2: 10 });
    const memberships = selectMemberships([membershipRel], [], [org]);
    expect(memberships).toEqual([{
      member: { entityType: 'npc', id: 1 },
      organization: { entityType: 'organization', id: 10 },
      source: 'explicit',
      relationshipId: 3,
      description: undefined,
    }]);
  });
});

describe('normalizeEntities', () => {
  it('attaches resolved memberships to their member entity', () => {
    const memberships = [{
      member: { entityType: 'npc' as const, id: 1 },
      organization: { entityType: 'organization' as const, id: 10 },
      source: 'explicit' as const,
    }];
    const [alice, bob] = normalizeEntities([npcAlice, npcBob], memberships);
    expect(alice.memberships).toHaveLength(1);
    expect(bob.memberships).toHaveLength(0);
  });
});

describe('buildVisualizationViewModel', () => {
  const npcs: NPC[] = [];
  const entities: EntityItem[] = [npcAlice, npcBob, org];

  it('produces nodes, non-membership edges, and memberships from raw campaign data', () => {
    const social = makeRelationship({ id: 1, npcId1: 1, npcId2: 2, type: 'ally' });
    const membership = makeRelationship({ id: 2, npcId1: 1, entityType2: 'organization', npcId2: 10 });

    const viewModel = buildVisualizationViewModel(entities, npcs, [org], [social, membership], createDefaultFilterCriteria());

    expect(viewModel.nodes).toHaveLength(3);
    expect(viewModel.edges).toHaveLength(1);
    expect(viewModel.edges[0].relationships[0].type).toBe('ally');
    expect(viewModel.memberships).toHaveLength(1);
  });

  it('does not create a graph edge for membership relationships', () => {
    const membership = makeRelationship({ id: 2, npcId1: 1, entityType2: 'organization', npcId2: 10 });
    const viewModel = buildVisualizationViewModel(entities, npcs, [org], [membership], createDefaultFilterCriteria());
    expect(viewModel.edges).toHaveLength(0);
    expect(viewModel.memberships).toHaveLength(1);
  });

  it('gracefully drops edges referencing entities missing from the entity list (dangling endpoints)', () => {
    const danglingRel = makeRelationship({ id: 5, npcId1: 1, npcId2: 999 });
    const viewModel = buildVisualizationViewModel(entities, npcs, [org], [danglingRel], createDefaultFilterCriteria());
    expect(viewModel.edges).toHaveLength(0);
  });

  it('excludes isolated entities when includeIsolatedEntities is false', () => {
    const social = makeRelationship({ id: 1, npcId1: 1, npcId2: 2, type: 'ally' });
    const criteria = { ...createDefaultFilterCriteria(), includeIsolatedEntities: false };
    const viewModel = buildVisualizationViewModel(entities, npcs, [org], [social], criteria);
    // org (10) has no relationship/membership, so it should be excluded.
    expect(viewModel.nodes.map(n => n.ref.id).sort()).toEqual([1, 2]);
  });

  it('respects entityTypes filter', () => {
    const social = makeRelationship({ id: 1, npcId1: 1, npcId2: 2, type: 'ally' });
    const criteria = { ...createDefaultFilterCriteria(), entityTypes: ['organization' as const] };
    const viewModel = buildVisualizationViewModel(entities, npcs, [org], [social], criteria);
    expect(viewModel.nodes).toHaveLength(1);
    expect(viewModel.nodes[0].ref.entityType).toBe('organization');
  });

  it('excludes inferred memberships when includeInferredMemberships is false', () => {
    const inferredNpcs: NPC[] = [{ id: 1, name: 'Alice', lineage: '', class: '', description: '', faction: 'Guild' }];
    const criteria = { ...createDefaultFilterCriteria(), includeInferredMemberships: false };
    const viewModel = buildVisualizationViewModel(entities, inferredNpcs, [org], [], criteria);
    expect(viewModel.memberships).toHaveLength(0);
  });
});
