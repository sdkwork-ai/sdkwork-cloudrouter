using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAiResourceGroupItem
    {
        public List<string>? Capabilities { get; set; }
        public string? Capability { get; set; }
        public string? Description { get; set; }
        public bool Dynamic { get; set; }
        public string GroupCode { get; set; }
        public string GroupName { get; set; }
        public string GroupType { get; set; }
        public string Id { get; set; }
        public string ResourceCount { get; set; }
        public string SelectionMode { get; set; }
        public string? SortOrder { get; set; }
        public string Status { get; set; }
        public List<string>? VendorCodes { get; set; }
    }
}
