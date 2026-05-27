import { describe, it, expect } from 'vitest'
import type { Campaign } from '@/types/campaign'
import type { EntityItem } from '@/types/entity'
import type { NPC, Relationship, RelationshipType } from '@/types/npc'
import type { Organization } from '@/types/organization'

describe('Type Definitions', () => {
  describe('Campaign', () => {
    it('should allow valid campaign objects', () => {
      const campaign: Campaign = {
        id: 1,
        name: 'Test Campaign',
        description: 'A test campaign',
        accountId: 1,
      }

      expect(campaign.id).toBe(1)
      expect(campaign.name).toBe('Test Campaign')
    })

    it('should allow campaigns without optional fields', () => {
      const campaign: Campaign = {
        id: 1,
        name: 'Minimal Campaign',
      }

      expect(campaign.description).toBeUndefined()
    })
  })

  describe('NPC', () => {
    it('should allow valid NPC objects', () => {
      const npc: NPC = {
        id: 1,
        name: 'Test NPC',
        lineage: 'Human',
        class: 'Fighter',
        description: 'A brave warrior',
        campaignId: 1,
        faction: 'Good Guys',
        notes: 'Likes swords',
      }

      expect(npc.id).toBe(1)
      expect(npc.name).toBe('Test NPC')
      expect(npc.lineage).toBe('Human')
      expect(npc.class).toBe('Fighter')
    })

    it('should allow NPCs without optional fields', () => {
      const npc: NPC = {
        id: 1,
        name: 'Minimal NPC',
        lineage: 'Elf',
        class: 'Wizard',
        description: 'A wise mage',
      }

      expect(npc.campaignId).toBeUndefined()
      expect(npc.faction).toBeUndefined()
      expect(npc.notes).toBeUndefined()
    })
  })

  describe('Relationship', () => {
    it('should allow valid relationship objects', () => {
      const relationship: Relationship = {
        id: 1,
        npcId1: 1,
        npcId2: 2,
        entityType1: 'npc',
        entityType2: 'npc',
        type: 'ally',
        description: 'Close friends',
        attitudeScore: 3,
      }

      expect(relationship.id).toBe(1)
      expect(relationship.npcId1).toBe(1)
      expect(relationship.npcId2).toBe(2)
      expect(relationship.type).toBe('ally')
      expect(relationship.attitudeScore).toBe(3)
    })

    it('should allow relationships without description', () => {
      const relationship: Relationship = {
        id: 1,
        npcId1: 1,
        npcId2: 2,
        entityType1: 'npc',
        entityType2: 'npc',
        type: 'enemy',
        attitudeScore: -4,
      }

      expect(relationship.description).toBeUndefined()
    })

    it('should enforce valid relationship types', () => {
      const validTypes: RelationshipType[] = [
        'ally',
        'enemy',
        'family',
        'rival',
        'mentor',
        'stranger',
        'neutral',
      ]

      validTypes.forEach(type => {
        const relationship: Relationship = {
          id: 1,
          npcId1: 1,
          npcId2: 2,
          entityType1: 'npc',
          entityType2: 'pc',
          type: type,
          attitudeScore: 0,
        }
        expect(relationship.type).toBe(type)
      })
    })

    it('should allow organization entity relationships', () => {
      const relationship: Relationship = {
        id: 9,
        npcId1: 1,
        npcId2: 5,
        entityType1: 'npc',
        entityType2: 'organization',
        type: 'member',
        attitudeScore: 0,
        isDerived: true,
      }

      expect(relationship.entityType2).toBe('organization')
      expect(relationship.type).toBe('member')
      expect(relationship.isDerived).toBe(true)
    })
  })

  describe('Organization', () => {
    it('should allow valid organization objects and entity items', () => {
      const organization: Organization = {
        id: 7,
        name: 'Guild',
        description: 'A city guild',
      }

      const entity: EntityItem = {
        id: organization.id,
        name: organization.name,
        entityType: 'organization',
      }

      expect(organization.name).toBe('Guild')
      expect(entity.entityType).toBe('organization')
    })
  })
})
