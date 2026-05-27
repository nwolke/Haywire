import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { EntityGraph } from '@/app/components/EntityGraph';
import type { EntityItem } from '@/types/entity';
import type { Relationship } from '@/types/npc';

const forceMocks = vi.hoisted(() => {
  const chargeStrength = vi.fn();
  const linkDistance = vi.fn();
  const linkStrength = vi.fn();
  const graphProps = vi.fn();
  const d3Force = vi.fn((force: string) => {
    if (force === 'charge') {
      return { strength: chargeStrength };
    }

    return {
      distance: (value: number) => {
        linkDistance(value);
        return { strength: linkStrength };
      },
    };
  });

  return { d3Force, chargeStrength, linkDistance, linkStrength, graphProps };
});

vi.mock('react-force-graph-2d', async () => {
  const ReactModule = await import('react');

  return {
    default: ReactModule.forwardRef((_props: any, ref: any) => {
      forceMocks.graphProps(_props);
      ReactModule.useImperativeHandle(ref, () => ({ d3Force: forceMocks.d3Force }));
      return ReactModule.createElement('div', { 'data-testid': 'force-graph' });
    }),
  };
});

describe('EntityGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses expanded defaults for node spacing and link elasticity', async () => {
    const entities: EntityItem[] = [
      { id: 1, name: 'Aldric', entityType: 'npc', lineage: 'Human', class: 'Knight' },
      { id: 2, name: 'Sylvara', entityType: 'pc', description: 'Wizard' },
    ];

    const relationships: Relationship[] = [
      {
        id: 1,
        npcId1: 1,
        npcId2: 2,
        entityType1: 'npc',
        entityType2: 'pc',
        type: 'ally',
        description: 'trusted allies',
        attitudeScore: 2,
      },
    ];

    render(<EntityGraph entities={entities} relationships={relationships} width={500} height={400} />);

    await waitFor(() => {
      expect(forceMocks.chargeStrength).toHaveBeenCalledWith(-600);
      expect(forceMocks.linkDistance).toHaveBeenCalledWith(200);
      expect(forceMocks.linkStrength).toHaveBeenCalledWith(0.2);
    });
  });

  it('renders organization nodes with the blue organization palette in labels', () => {
    const entities: EntityItem[] = [
      { id: 1, name: 'Aldric', entityType: 'npc', lineage: 'Human', class: 'Knight' },
      { id: 7, name: 'Azure Accord', entityType: 'organization' },
    ];

    const relationships: Relationship[] = [
      {
        id: 3,
        npcId1: 1,
        npcId2: 7,
        entityType1: 'npc',
        entityType2: 'organization',
        type: 'member',
        attitudeScore: 0,
        isDerived: true,
      },
    ];

    render(<EntityGraph entities={entities} relationships={relationships} width={500} height={400} />);

    const latestProps = forceMocks.graphProps.mock.calls.at(-1)?.[0];
    expect(latestProps).toBeDefined();

    const labelHtml = latestProps.nodeLabel({
      name: 'Azure Accord',
      entityType: 'organization',
      subtitle: 'Organization',
    });

    expect(labelHtml).toContain('#3b82f6');
    expect(labelHtml).toContain('Azure Accord');
  });
});
