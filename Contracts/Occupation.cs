using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;

namespace HaywireGM.Server.DbModels
{
    [Table("occupation")]
    [PrimaryKey("occupation_id")]
    public class Occupation
    {
        public int occupation_id { get; set; }
        public required string occupation_name { get; set; }
    }
}
