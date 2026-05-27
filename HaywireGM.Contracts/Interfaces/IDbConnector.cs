using System.Data;

namespace HaywireGM.Contracts.Interfaces;

public interface IDbConnector
{
    /// <summary>
    /// Creates a new database connection
    /// </summary>
    IDbConnection CreateConnection();

    /// <summary>
    /// Gets the connection string for direct use
    /// </summary>
    string ConnectionString { get; }
}
