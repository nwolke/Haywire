using HaywireGM.Contracts.DbEntities;
using HaywireGM.Contracts.Models;

namespace HaywireGM.Contracts.Interfaces;

public interface ICampaignLogic
{
    Task<IEnumerable<CampaignDTO>> GetCampaignsByAccountAsync(int accountId, CancellationToken ct = default);
    Task<CampaignDTO?> GetCampaignAsync(int campaignId, CancellationToken ct = default);
    Task<CampaignDTO?> GetCampaignAsync(int campaignId, int accountId, CancellationToken ct = default);
    Task<int> CreateCampaignAsync(int accountId, CampaignDTO campaignDto, CancellationToken ct = default);
    Task<bool> UpdateCampaignAsync(int accountId, CampaignDTO campaignDto, CancellationToken ct = default);
    Task<bool> DeleteCampaignAsync(int campaignId, int accountId, CancellationToken ct = default);
}
