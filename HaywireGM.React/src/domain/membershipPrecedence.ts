import type { NPC } from '@/types/npc';
import type { EntityItem } from '@/types/entity';
import type { MembershipRecord, EntityRef } from '@/types/visualization';
import { toEntityKey } from '@/types/visualization';

/**
 * Membership precedence and migration rules (Story 1.4).
 *
 * Resolves a single canonical membership truth per entity by preferring
 * explicit organization relationships over legacy NPC free-text `faction`
 * values. Legacy faction-only memberships are flagged `source: 'inferred'`
 * so the UI can present them as read-only.
 *
 * Precedence rule: for a given (member, organization) pair, if an explicit
 * relationship membership already exists, the inferred faction-text
 * membership for that same pair is suppressed to avoid duplication.
 *
 * Migration note: once the backend exposes first-class membership entities
 * (see recommended future API improvements), this module's `inferred`
 * branch can be removed entirely in favor of server-provided memberships.
 */

export interface ExplicitMembershipInput {
  relationshipId: number;
  member: EntityRef;
  organization: EntityRef;
  description?: string;
}

function membershipPairKey(member: EntityRef, organization: EntityRef): string {
  return `${toEntityKey(member)}->${toEntityKey(organization)}`;
}

/**
 * Resolve the canonical set of memberships for a campaign, applying
 * explicit-over-inferred precedence.
 *
 * @param explicitMemberships Memberships derived from real relationship records (entityType `organization`).
 * @param npcs All NPCs in the campaign, used to infer legacy faction-text memberships.
 * @param organizationsByName Lookup of organization entities keyed by lowercase, trimmed name.
 */
export function resolveMemberships(
  explicitMemberships: ExplicitMembershipInput[],
  npcs: NPC[],
  organizationsByName: Map<string, EntityItem>,
): MembershipRecord[] {
  const explicitPairKeys = new Set<string>();
  const resolved: MembershipRecord[] = [];

  for (const explicit of explicitMemberships) {
    const key = membershipPairKey(explicit.member, explicit.organization);
    explicitPairKeys.add(key);
    resolved.push({
      member: explicit.member,
      organization: explicit.organization,
      source: 'explicit',
      relationshipId: explicit.relationshipId,
      description: explicit.description,
    });
  }

  for (const npc of npcs) {
    const factionName = npc.faction?.trim();
    if (!factionName) {
      continue;
    }

    const organization = organizationsByName.get(factionName.toLowerCase());
    if (!organization) {
      continue;
    }

    const member: EntityRef = { entityType: 'npc', id: npc.id };
    const organizationRef: EntityRef = { entityType: 'organization', id: organization.id };
    const key = membershipPairKey(member, organizationRef);

    // Explicit membership takes precedence; skip the inferred duplicate.
    if (explicitPairKeys.has(key)) {
      continue;
    }

    resolved.push({
      member,
      organization: organizationRef,
      source: 'inferred',
      description: `${npc.name} is part of ${organization.name} (inferred from legacy faction text).`,
    });
  }

  return resolved;
}

/** Memberships that were inferred from legacy faction text cannot be edited/deleted via relationship CRUD. */
export function isEditableMembership(membership: MembershipRecord): boolean {
  return membership.source === 'explicit';
}
