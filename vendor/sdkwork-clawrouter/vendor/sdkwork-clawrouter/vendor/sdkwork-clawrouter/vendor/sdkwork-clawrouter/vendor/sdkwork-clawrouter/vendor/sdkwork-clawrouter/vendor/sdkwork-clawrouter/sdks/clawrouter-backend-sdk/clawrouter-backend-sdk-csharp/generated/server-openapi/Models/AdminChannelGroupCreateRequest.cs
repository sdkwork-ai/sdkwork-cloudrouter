using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminChannelGroupCreateRequest
    {
        public Dictionary<string, object>? Capacity { get; set; }
        public string GroupCode { get; set; }
        public string GroupName { get; set; }
        public string GroupType { get; set; }
        public double? OfficialPriceMultiplier { get; set; }
        public string PriceReferenceMode { get; set; }
        public double? RateMultiplier { get; set; }
        public List<string>? ResourceCodes { get; set; }
        public List<string>? ResourceGroupCodes { get; set; }
        public string Status { get; set; }
    }
}
