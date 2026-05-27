namespace HaywireGM.Contracts.Interfaces;

public interface INewAccountDataSeeder
{
    Task SeedDefaultDataForNewAccountAsync(int accountId);
}