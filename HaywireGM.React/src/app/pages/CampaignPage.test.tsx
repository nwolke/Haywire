import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampaignPage } from '@/app/pages/CampaignPage';
import type { Campaign } from '@/types/campaign';
import type { NPC, Relationship } from '@/types/npc';
import type { PC } from '@/types/pc';
import type { Organization } from '@/types/organization';

const useAuthMock = vi.fn();
const useCampaignDataMock = vi.fn();
const useNPCDataMock = vi.fn();
const usePCDataMock = vi.fn();
const useOrganizationDataMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/useCampaignData', () => ({
  useCampaignData: () => useCampaignDataMock(),
}));

vi.mock('@/hooks/useNPCData', () => ({
  useNPCData: (...args: unknown[]) => useNPCDataMock(...args),
}));

vi.mock('@/hooks/usePCData', () => ({
  usePCData: (...args: unknown[]) => usePCDataMock(...args),
}));

vi.mock('@/hooks/useOrganizationData', () => ({
  useOrganizationData: () => useOrganizationDataMock(),
}));

vi.mock('@/app/components/Header', () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock('@/app/components/EntityGraph', () => ({
  EntityGraph: () => <div data-testid="entity-graph" />,
}));

vi.mock('@/app/components/CampaignAnalyticsPanel', () => ({
  CampaignAnalyticsPanel: () => <div data-testid="campaign-analytics" />,
}));

vi.mock('@/app/components/EntityDetailPanel', () => ({
  EntityDetailPanel: ({
    entity,
    onUpdateRelationship,
  }: {
    entity: { name: string } | null;
    onUpdateRelationship: (id: number, updates: { description: string }) => Promise<void>;
  }) => (
    <div>
      <div>{`Selected entity: ${entity?.name ?? 'none'}`}</div>
      <button type="button" onClick={() => void onUpdateRelationship(42, { description: 'updated' })}>
        Update relationship
      </button>
    </div>
  ),
}));

vi.mock('@/app/components/NPCForm', () => ({
  NPCForm: ({
    open,
    editingNPC,
    onSave,
  }: {
    open: boolean;
    editingNPC?: NPC | null;
    onSave: (npc: NPC) => Promise<void>;
  }) => open ? (
    <button
      type="button"
      onClick={() => void onSave({
        ...(editingNPC as NPC),
        faction: 'New Guild',
      })}
    >
      Submit NPC Form
    </button>
  ) : null,
}));

vi.mock('@/app/components/PCForm', () => ({
  PCForm: () => null,
}));

describe('CampaignPage', () => {
  let campaigns: Campaign[];
  let npcs: NPC[];
  let pcs: PC[];
  let relationships: Relationship[];
  let organizations: Organization[];

  const refreshNpcs = vi.fn().mockResolvedValue(undefined);
  const refreshPcs = vi.fn().mockResolvedValue(undefined);
  const refreshOrganizations = vi.fn().mockResolvedValue(undefined);
  const saveNPC = vi.fn().mockImplementation(async (npc: NPC) => {
    npcs = npcs.map(existing => existing.id === npc.id ? npc : existing);
  });
  const deleteNPC = vi.fn().mockResolvedValue(undefined);
  const addRelationship = vi.fn().mockResolvedValue(undefined);
  const deleteRelationship = vi.fn().mockResolvedValue(undefined);
  const updateRelationship = vi.fn().mockResolvedValue(undefined);
  const savePc = vi.fn().mockResolvedValue(undefined);
  const deletePc = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    campaigns = [{ id: 1, name: 'Test Campaign', description: 'Test campaign' }];
    npcs = [{
      id: 1,
      name: 'Aldric',
      lineage: 'Human',
      class: 'Knight',
      description: 'Knight of the guild',
      faction: 'Old Guild',
      campaignId: 1,
    }];
    pcs = [{
      id: 2,
      name: 'Lyra',
      description: 'Wizard',
      campaignId: 1,
    }];
    relationships = [{
      id: 42,
      npcId1: 1,
      npcId2: 2,
      entityType1: 'npc',
      entityType2: 'pc',
      type: 'ally',
      description: 'Trusted friends',
      attitudeScore: 2,
      campaignId: 1,
    }];
    organizations = [];

    vi.clearAllMocks();

    class ResizeObserverMock {
      observe() {}
      disconnect() {}
      unobserve() {}
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      loginWithCognito: vi.fn(),
      loading: false,
    });

    useCampaignDataMock.mockImplementation(() => ({
      campaigns,
    }));

    useNPCDataMock.mockImplementation(() => ({
      npcs,
      relationships,
      loading: false,
      error: null,
      refreshNpcs,
      saveNPC,
      deleteNPC,
      addRelationship,
      deleteRelationship,
      updateRelationship,
    }));

    usePCDataMock.mockImplementation(() => ({
      pcs,
      loading: false,
      error: null,
      refreshPcs,
      savePc,
      deletePc,
    }));

    useOrganizationDataMock.mockImplementation(() => ({
      organizations,
      loading: false,
      error: null,
      refreshOrganizations,
    }));
  });

  const renderPage = () => render(
    <MemoryRouter initialEntries={['/campaign/1']}>
      <Routes>
        <Route path="/campaign/:id" element={<CampaignPage />} />
      </Routes>
    </MemoryRouter>,
  );

  it('keeps the selected faction-backed organization in sync after faction edits', async () => {
    const user = userEvent.setup();
    const { rerender } = renderPage();

    await user.click(screen.getByRole('button', { name: /old guild/i }));
    expect(screen.getByText('Selected entity: Old Guild')).toBeInTheDocument();

    npcs = [{
      ...npcs[0],
      faction: 'New Guild',
    }];

    rerender(
      <MemoryRouter initialEntries={['/campaign/1']}>
        <Routes>
          <Route path="/campaign/:id" element={<CampaignPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Selected entity: New Guild')).toBeInTheDocument();
    });
  });

  it('refreshes organizations after saving NPC edits', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /aldric/i }));
    await user.click(screen.getByRole('button', { name: /edit/i }));
    await user.click(screen.getByRole('button', { name: /submit npc form/i }));

    await waitFor(() => {
      expect(saveNPC).toHaveBeenCalledTimes(1);
      expect(refreshOrganizations).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps relationship editing wired through the detail panel', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /update relationship/i }));

    expect(updateRelationship).toHaveBeenCalledWith(42, { description: 'updated' });
  });
});
