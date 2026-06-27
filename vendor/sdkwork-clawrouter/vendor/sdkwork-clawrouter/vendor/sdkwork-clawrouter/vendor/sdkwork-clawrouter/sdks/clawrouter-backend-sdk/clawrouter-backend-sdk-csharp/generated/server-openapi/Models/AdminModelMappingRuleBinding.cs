using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminModelMappingRuleBinding
    {
        public string? BindingCode { get; set; }
        public string? BindingId { get; set; }
        public string? BindingName { get; set; }
        public string BindingType { get; set; }
        public string? CreatedAt { get; set; }
        public bool Enabled { get; set; }
        public string Id { get; set; }
        public string SortOrder { get; set; }
        public string? UpdatedAt { get; set; }
    }
}
