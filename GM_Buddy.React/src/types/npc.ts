import type { EntityType } from './entity';

export interface NPC {
  id: number;
  name: string;
  lineage: string;
  class: string;
  description: string;
  campaignId?: number;
  faction?: string;
  notes?: string;
  accountId?: number;
}

export interface Relationship {
  id: number;
  npcId1: number;
  npcId2: number;
  entityType1: EntityType;
  entityType2: EntityType;
  type: RelationshipType;
  description?: string;
  attitudeScore: number;
  campaignId?: number;
  isDerived?: boolean;
}

export type RelationshipType =
  | 'acquaintance'
  | 'ally'
  | 'friend'
  | 'contact/informant'
  | 'employer'
  | 'enemy'
  | 'family'
  | 'lover'
  | 'member'
  | 'mentor'
  | 'patron'
  | 'rival'
  | 'stranger'
  | 'vassal/follower'
  | 'neutral';

// Auth context types
export interface User {
  cognitoSub: string;
  email: string;
  accountId?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  isLoggingIn: boolean;
}
