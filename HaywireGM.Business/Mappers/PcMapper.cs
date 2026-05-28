using HaywireGM.Contracts.DbEntities;
using HaywireGM.Contracts.Models.Pcs;

namespace HaywireGM.Business.Mappers;

public class PcMapper
{
    public static PcDto MapToPcDto(Pc pc) => new PcDto
    {
        Pc_Id = pc.pc_id,
        Campaign_Id = pc.campaign_id,
        Name = pc.name,
        Description = pc.description
    };
}
