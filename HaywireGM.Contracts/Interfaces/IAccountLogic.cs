namespace HaywireGM.Contracts.Interfaces;

public interface IAccountLogic
{
    Task DeleteAccountAsync(int accountId);

    Task<object> ExportAccountDataAsync(int accountId);
}
