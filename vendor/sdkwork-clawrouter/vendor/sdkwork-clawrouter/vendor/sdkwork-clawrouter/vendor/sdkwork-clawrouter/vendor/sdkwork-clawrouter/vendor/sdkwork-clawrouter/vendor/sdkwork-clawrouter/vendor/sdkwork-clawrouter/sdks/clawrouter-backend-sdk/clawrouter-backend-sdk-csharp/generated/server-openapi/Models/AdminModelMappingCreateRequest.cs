using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminModelMappingCreateRequest
    {
        public List<AdminModelMappingRuleBindingInput> Bindings { get; set; }
        public bool? Enabled { get; set; }
        public List<AdminModelMappingRuleItemInput> MappingItems { get; set; }
        public string? MappingMode { get; set; }
        public string? MatchType { get; set; }
        public string SourceVendorCode { get; set; }
        public string? SourceVendorId { get; set; }
        public string TargetVendorCode { get; set; }
        public string? TargetVendorId { get; set; }
    }
}
