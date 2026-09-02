import { describe, expect, it } from 'vitest';
import type { NPC } from '@/types/npc';
import type { EntityItem } from '@/types/entity';
import { resolveMemberships, isEditableMembership, type ExplicitMembershipInput } from './membershipPrecedence';

function makeNpc(overrides: Partial<NPC> & { id: number; name: string }): NPC {
  return {
    lineage: '',
    class: '',
    description: '',
    ...overrides,
  };
}

const organization: EntityItem = { id: 10, name: 'The Silver Hand', entityType: 'organization' };
const organizationsByName = new Map<string, EntityItem>([[organization.name.toLowerCase(), organization]]);

describe('membershipPrecedence', () => {
  it('includes explicit memberships as-is', () => {
    const explicit: ExplicitMembershipInput[] = [{
      relationshipId: 1,
      member: { entityType: 'npc', id: 1 },
      organization: { entityType: 'organization', id: 10 },
    }];

    const resolved = resolveMemberships(explicit, [], organizationsByName);
    expect(resolved).toEqual([{
      member: { entityType: 'npc', id: 1 },
      organization: { entityType: 'organization', id: 10 },
      source: 'explicit',
      relationshipId: 1,
      description: undefined,
    }]);
  });

  it('infers memberships from legacy faction text when no explicit membership exists', () => {
    const npcs = [makeNpc({ id: 2, name: 'Bob', faction: 'The Silver Hand' })];
    const resolved = resolveMemberships([], npcs, organizationsByName);

    expect(resolved).toHaveLength(1);
    expect(resolved[0].source).toBe('inferred');
    expect(resolved[0].member).toEqual({ entityType: 'npc', id: 2 });
    expect(resolved[0].organization).toEqual({ entityType: 'organization', id: 10 });
  });

  it('explicit membership takes precedence over matching legacy faction text (no duplication)', () => {
    const npcs = [makeNpc({ id: 3, name: 'Carol', faction: 'The Silver Hand' })];
    const explicit: ExplicitMembershipInput[] = [{
      relationshipId: 99,
      member: { entityType: 'npc', id: 3 },
      organization: { entityType: 'organization', id: 10 },
    }];

    const resolved = resolveMemberships(explicit, npcs, organizationsByName);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].source).toBe('explicit');
  });

  it('ignores faction text that does not match a known organization', () => {
    const npcs = [makeNpc({ id: 4, name: 'Dave', faction: 'Unknown Guild' })];
    expect(resolveMemberships([], npcs, organizationsByName)).toHaveLength(0);
  });

  it('ignores npcs without faction text', () => {
    const npcs = [makeNpc({ id: 5, name: 'Eve' })];
    expect(resolveMemberships([], npcs, organizationsByName)).toHaveLength(0);
  });

  it('flags only explicit memberships as editable', () => {
    const explicitRecord = { member: { entityType: 'npc' as const, id: 1 }, organization: { entityType: 'organization' as const, id: 10 }, source: 'explicit' as const };
    const inferredRecord = { member: { entityType: 'npc' as const, id: 1 }, organization: { entityType: 'organization' as const, id: 10 }, source: 'inferred' as const };
    expect(isEditableMembership(explicitRecord)).toBe(true);
    expect(isEditableMembership(inferredRecord)).toBe(false);
  });
});
