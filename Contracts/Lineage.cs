using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;

namespace HaywireGM.Server.DbModels
{
    [Table("lineage")]
    [PrimaryKey("lineage_id")]
    public class Lineage
    {
        public int lineage_id { get; set; }
        public required string lineage_name { get; set; }
    }
}
