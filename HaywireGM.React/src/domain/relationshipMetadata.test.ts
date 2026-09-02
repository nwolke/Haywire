import { describe, expect, it } from 'vitest';
import {
  getRelationshipMetadata,
  getRelationshipColor,
  getRelationshipBadgeClassName,
  getRelationshipLabel,
  getRelationshipCategory,
  listKnownRelationshipTypes,
  MEMBERSHIP_METADATA,
  FALLBACK_RELATIONSHIP_METADATA,
} from './relationshipMetadata';

describe('relationshipMetadata', () => {
  it('resolves known relationship types', () => {
    const ally = getRelationshipMetadata('ally');
    expect(ally.label).toBe('Ally');
    expect(ally.category).toBe('positive');
    expect(ally.color).toBe('#10b981');
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(getRelationshipMetadata(' Ally ')).toEqual(getRelationshipMetadata('ally'));
  });

  it('falls back safely for unrecognized/legacy types', () => {
    expect(getRelationshipMetadata('some-legacy-type')).toEqual(FALLBACK_RELATIONSHIP_METADATA);
    expect(getRelationshipMetadata(undefined)).toEqual(FALLBACK_RELATIONSHIP_METADATA);
    expect(getRelationshipMetadata(null)).toEqual(FALLBACK_RELATIONSHIP_METADATA);
  });

  it('treats membership as a distinct classification', () => {
    expect(getRelationshipMetadata('membership')).toEqual(MEMBERSHIP_METADATA);
    expect(getRelationshipCategory('membership')).toBe('membership');
  });

  it('exposes color/badge/label helpers consistent with the full metadata entry', () => {
    expect(getRelationshipColor('enemy')).toBe('#ef4444');
    expect(getRelationshipBadgeClassName('enemy')).toBe('bg-red-500');
    expect(getRelationshipLabel('enemy')).toBe('Enemy');
  });

  it('lists all known relationship types with no duplicates', () => {
    const types = listKnownRelationshipTypes().map(entry => entry.type);
    expect(new Set(types).size).toBe(types.length);
    expect(types).toContain('ally');
    expect(types).not.toContain('membership');
  });
});
