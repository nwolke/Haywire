import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import type { NPC } from '@/types/npc';
import { NPCForm } from '@/app/components/NPCForm';

describe('NPCForm', () => {
  it('does not render a campaign selector', () => {
    render(
      <NPCForm
        open
        onOpenChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        campaignId={1}
      />
    );

    expect(screen.queryByLabelText(/campaign/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Campaign *')).not.toBeInTheDocument();
  });

  it('submits the route campaignId for create and edit flows', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const editingNPC: NPC = {
      id: 9,
      name: 'Existing NPC',
      lineage: 'Elf',
      class: 'Ranger',
      description: 'Scout',
      campaignId: 999,
      faction: 'Old Faction',
      notes: 'Old notes',
    };

    const { rerender } = render(
      <NPCForm
        open
        onOpenChange={vi.fn()}
        onSave={onSave}
        campaignId={42}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'New NPC');
    await user.type(screen.getByLabelText(/lineage/i), 'Human');
    await user.type(screen.getByLabelText(/^class/i), 'Warrior');
    await user.type(screen.getByLabelText(/description/i), 'Bodyguard');
    await user.click(screen.getByRole('button', { name: /create npc/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenNthCalledWith(1, expect.objectContaining({ campaignId: 42 }));

    rerender(
      <NPCForm
        open
        onOpenChange={vi.fn()}
        onSave={onSave}
        editingNPC={editingNPC}
        campaignId={42}
      />
    );

    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), 'Edited NPC');
    await user.click(screen.getByRole('button', { name: /update npc/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 9, campaignId: 42 }));
  });
});
