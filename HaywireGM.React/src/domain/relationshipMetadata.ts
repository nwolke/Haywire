import type { RelationshipCategory } from '@/types/visualization';

/**
 * Centralized relationship metadata registry (Story 1.2).
 *
 * This is the single source of truth for relationship labels, visual
 * encodings (color, badge class), and category classification. Any
 * visualization surface (graph, legend, filters, matrix, hierarchy,
 * analytics) must read from this registry rather than maintaining its own
 * private color dictionary.
 */
export interface RelationshipMetadataEntry {
  type: string;
  label: string;
  category: RelationshipCategory;
  /** Hex/rgb color used for canvas-based rendering (graph edges/legend dots). */
  color: string;
  /** Tailwind utility class used for badge-style UI. */
  badgeClassName: string;
}

const RELATIONSHIP_METADATA: readonly RelationshipMetadataEntry[] = [
  { type: 'acquaintance', label: 'Acquaintance', category: 'neutral', color: '#64748b', badgeClassName: 'bg-slate-500' },
  { type: 'ally', label: 'Ally', category: 'positive', color: '#10b981', badgeClassName: 'bg-green-500' },
  { type: 'contact/informant', label: 'Contact/Informant', category: 'professional', color: '#14b8a6', badgeClassName: 'bg-teal-500' },
  { type: 'employer', label: 'Employer', category: 'professional', color: '#d97706', badgeClassName: 'bg-amber-600' },
  { type: 'enemy', label: 'Enemy', category: 'negative', color: '#ef4444', badgeClassName: 'bg-red-500' },
  { type: 'family', label: 'Family', category: 'familial', color: '#a855f7', badgeClassName: 'bg-purple-500' },
  { type: 'friend', label: 'Friend', category: 'positive', color: '#34d399', badgeClassName: 'bg-emerald-400' },
  { type: 'lover', label: 'Lover', category: 'familial', color: '#f43f5e', badgeClassName: 'bg-rose-500' },
  { type: 'member', label: 'Member', category: 'membership', color: '#0ea5e9', badgeClassName: 'bg-sky-500' },
  { type: 'mentor', label: 'Mentor', category: 'professional', color: '#3b82f6', badgeClassName: 'bg-blue-500' },
  { type: 'patron', label: 'Patron', category: 'professional', color: '#0ea5e9', badgeClassName: 'bg-sky-500' },
  { type: 'rival', label: 'Rival', category: 'negative', color: '#f97316', badgeClassName: 'bg-orange-500' },
  { type: 'stranger', label: 'Stranger', category: 'neutral', color: '#71717a', badgeClassName: 'bg-zinc-500' },
  { type: 'vassal/follower', label: 'Vassal/Follower', category: 'professional', color: '#78716c', badgeClassName: 'bg-stone-500' },
];

/** Safe fallback used for unrecognized or legacy relationship types. */
export const FALLBACK_RELATIONSHIP_METADATA: RelationshipMetadataEntry = {
  type: 'neutral',
  label: 'Other',
  category: 'neutral',
  color: '#6b7280',
  badgeClassName: 'bg-gray-500',
};

/** Dedicated classification, badge color, and label for organization membership. */
export const MEMBERSHIP_METADATA: RelationshipMetadataEntry = {
  type: 'membership',
  label: 'Membership',
  category: 'membership',
  color: '#0ea5e9',
  badgeClassName: 'bg-sky-500',
};

const metadataByType = new Map<string, RelationshipMetadataEntry>(
  RELATIONSHIP_METADATA.map(entry => [entry.type, entry]),
);

function normalizeType(type: string | undefined | null): string {
  return (type ?? '').trim().toLowerCase();
}

/** Look up the metadata entry for a relationship type, falling back to a neutral default when unrecognized. */
export function getRelationshipMetadata(type: string | undefined | null): RelationshipMetadataEntry {
  const normalized = normalizeType(type);
  if (normalized === MEMBERSHIP_METADATA.type) {
    return MEMBERSHIP_METADATA;
  }
  return metadataByType.get(normalized) ?? FALLBACK_RELATIONSHIP_METADATA;
}

export function getRelationshipColor(type: string | undefined | null): string {
  return getRelationshipMetadata(type).color;
}

export function getRelationshipBadgeClassName(type: string | undefined | null): string {
  return getRelationshipMetadata(type).badgeClassName;
}

export function getRelationshipLabel(type: string | undefined | null): string {
  return getRelationshipMetadata(type).label;
}

export function getRelationshipCategory(type: string | undefined | null): RelationshipCategory {
  return getRelationshipMetadata(type).category;
}

/** All known, non-membership relationship types in a stable display order. */
export function listKnownRelationshipTypes(): readonly RelationshipMetadataEntry[] {
  return RELATIONSHIP_METADATA;
}
