using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminModelMappingResolveResponse
    {
        public bool Matched { get; set; }
        public string? MatchedBindingType { get; set; }
        public AdminModelMappingRule? Rule { get; set; }
        public string SourceModel { get; set; }
        public string? TargetCatalogKey { get; set; }
        public string TargetModel { get; set; }
        public string? TargetProviderModel { get; set; }
        public string? TargetProviderNativeModel { get; set; }
        public string? TargetVendorCode { get; set; }
    }
}
