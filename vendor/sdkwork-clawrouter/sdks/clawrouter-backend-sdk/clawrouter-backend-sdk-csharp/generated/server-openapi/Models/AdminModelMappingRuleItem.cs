using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminModelMappingRuleItem
    {
        public string? CreatedAt { get; set; }
        public bool Enabled { get; set; }
        public string Id { get; set; }
        public string SortOrder { get; set; }
        public string? SourceCatalogKey { get; set; }
        public string SourceModel { get; set; }
        public string? TargetCatalogKey { get; set; }
        public string TargetModel { get; set; }
        public string? TargetProviderModel { get; set; }
        public string? TargetProviderNativeModel { get; set; }
        public string? UpdatedAt { get; set; }
    }
}
