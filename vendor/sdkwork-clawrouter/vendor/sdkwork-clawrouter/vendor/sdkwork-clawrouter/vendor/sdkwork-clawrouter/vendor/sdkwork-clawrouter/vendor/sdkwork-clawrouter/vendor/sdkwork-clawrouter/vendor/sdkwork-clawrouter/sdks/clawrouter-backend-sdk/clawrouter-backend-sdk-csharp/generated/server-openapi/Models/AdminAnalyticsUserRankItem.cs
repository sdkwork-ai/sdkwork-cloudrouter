using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAnalyticsUserRankItem
    {
        public string? Email { get; set; }
        public List<AdminPieChartItem> ModelDistribution { get; set; }
        public double Points { get; set; }
        public string Rank { get; set; }
        public string RequestCount { get; set; }
        public double TotalTokens { get; set; }
        public string UserId { get; set; }
        public string UserName { get; set; }
    }
}
