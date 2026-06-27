using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAiModelRegionPrice
    {
        public string? CacheReadPrice { get; set; }
        public string? CacheWritePrice { get; set; }
        public string Currency { get; set; }
        public string PriceIn { get; set; }
        public string PriceOut { get; set; }
        public string RegionCode { get; set; }
    }
}
