using HaywireGM.Contracts.Models.Npcs;

namespace HaywireGM.Contracts.Interfaces;

public interface INpcLogic
{
    Task<IEnumerable<NpcDto>> GetNpcList(int account_id, int? campaignId, CancellationToken ct = default);
    Task<NpcDto?> GetNpc(int npc_id, CancellationToken ct = default);
    Task<int> CreateNpcAsync(int accountId, CreateNpcRequest request, CancellationToken ct = default);
    Task<bool> UpdateNpcAsync(int npcId, int accountId, UpdateNpcRequest request, CancellationToken ct = default);
    Task<bool> DeleteNpcAsync(int npcId, CancellationToken ct = default);
}