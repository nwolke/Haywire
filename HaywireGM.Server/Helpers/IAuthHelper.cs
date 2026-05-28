
namespace HaywireGM.Server.Helpers;

public interface IAuthHelper
{
    Task<int> GetAuthenticatedAccountIdAsync();
}