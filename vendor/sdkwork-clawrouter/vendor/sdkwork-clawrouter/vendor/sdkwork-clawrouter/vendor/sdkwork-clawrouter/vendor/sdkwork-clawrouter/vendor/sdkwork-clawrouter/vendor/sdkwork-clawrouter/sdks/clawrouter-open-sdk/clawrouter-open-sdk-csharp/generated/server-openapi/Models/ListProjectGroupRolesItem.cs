using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class ListProjectGroupRolesItem
    {
        public int? Created { get; set; }
        public int? CreatedAt { get; set; }
        public string? Email { get; set; }
        public string? Id { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Name { get; set; }
        public string? Object { get; set; }
        public string? ProjectId { get; set; }
        public string? Role { get; set; }
        public string? Status { get; set; }
    }
}
