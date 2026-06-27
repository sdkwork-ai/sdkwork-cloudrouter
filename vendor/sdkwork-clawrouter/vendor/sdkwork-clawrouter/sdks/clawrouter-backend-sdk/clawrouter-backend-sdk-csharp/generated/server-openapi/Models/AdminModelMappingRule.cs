using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminModelMappingRule
    {
        public string BindingType { get; set; }
        public List<AdminModelMappingRuleBinding> Bindings { get; set; }
        public string? CreatedAt { get; set; }
        public bool Enabled { get; set; }
        public string Id { get; set; }
        public List<AdminModelMappingRuleItem> MappingItems { get; set; }
        public string MappingMode { get; set; }
        public string MatchType { get; set; }
        public string SourceVendorCode { get; set; }
        public string? SourceVendorId { get; set; }
        public string TargetVendorCode { get; set; }
        public string? TargetVendorId { get; set; }
        public string? UpdatedAt { get; set; }
    }
}
