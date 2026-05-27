using HaywireGM.Contracts.DbEntities;

namespace HaywireGM.Contracts.Interfaces;

public interface IAuthLogic
{
    Task<Account> GetOrCreateAccountByCognitoSubAsync(string cognitoSub, string? email);
}