using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAnalyticsModelRankItem
    {
        public double AverageTokensPerRequest { get; set; }
        public string CatalogKey { get; set; }
        public double ErrorRate { get; set; }
        public string Modality { get; set; }
        public string Model { get; set; }
        public double Points { get; set; }
        public string Rank { get; set; }
        public string RequestCount { get; set; }
        public double TotalTokens { get; set; }
        public double UpstreamCost { get; set; }
        public string UserCount { get; set; }
        public string Vendor { get; set; }
    }
}
