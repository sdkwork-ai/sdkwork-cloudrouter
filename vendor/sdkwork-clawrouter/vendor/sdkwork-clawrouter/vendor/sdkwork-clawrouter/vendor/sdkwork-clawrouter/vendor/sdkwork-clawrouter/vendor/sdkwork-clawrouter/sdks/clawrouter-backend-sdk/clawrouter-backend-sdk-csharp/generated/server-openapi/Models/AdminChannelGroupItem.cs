using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminChannelGroupItem
    {
        public AdminCountPair AccountCount { get; set; }
        public AdminCapacityPair Capacity { get; set; }
        public string GroupCode { get; set; }
        public string GroupName { get; set; }
        public string GroupType { get; set; }
        public string Id { get; set; }
        public double OfficialPriceMultiplier { get; set; }
        public string PriceReferenceMode { get; set; }
        public string ProviderCode { get; set; }
        public double RateMultiplier { get; set; }
        public List<string> ResourceCodes { get; set; }
        public List<string> ResourceGroupCodes { get; set; }
        public string Status { get; set; }
        public AdminUsagePair Usage { get; set; }
    }
}
