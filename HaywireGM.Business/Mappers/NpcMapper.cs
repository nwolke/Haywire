using HaywireGM.Contracts.DbEntities;
using HaywireGM.Contracts.Models.Npcs;

namespace HaywireGM.Business.Mappers;

public class NpcMapper
{
    public static NpcDto MapToNpcDto(Npc npc)
    {
        return new NpcDto
        {
            Npc_Id = npc.npc_id,
            Account_Id = npc.account_id,
            Campaign_Id = npc.campaign_id,
            Name = npc.name,
            Description = npc.description,
            Lineage = npc.lineage,
            Class = npc.@class,
            Faction = npc.faction,
            Notes = npc.notes
        };
    }
}
