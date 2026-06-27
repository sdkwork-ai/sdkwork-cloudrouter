using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ModelRankingItem
    {
        public string BaseVolume { get; set; }
        public string Color { get; set; }
        public string? ContextSize { get; set; }
        public double Cost { get; set; }
        public string CostIndicator { get; set; }
        public string Currency { get; set; }
        public string Id { get; set; }
        public bool IsNew { get; set; }
        public string Latency { get; set; }
        public string? License { get; set; }
        public string Modality { get; set; }
        public string Name { get; set; }
        public string PrevRank { get; set; }
        public string? Pricing { get; set; }
        public string Rank { get; set; }
        public string Requests { get; set; }
        public List<string> Strengths { get; set; }
        public string Tokens { get; set; }
        public double? TrendScore { get; set; }
        public string Vendor { get; set; }
        public string VendorCode { get; set; }
        public double? WinRate { get; set; }
    }
}
