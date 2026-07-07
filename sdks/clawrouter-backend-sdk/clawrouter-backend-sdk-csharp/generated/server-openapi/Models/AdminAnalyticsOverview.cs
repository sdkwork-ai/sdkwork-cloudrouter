using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAnalyticsOverview
    {
        public string? EndTime { get; set; }
        public List<Dictionary<string, object>> Insights { get; set; }
        public List<Dictionary<string, object>> ModalityDistribution { get; set; }
        public List<Dictionary<string, object>> ModelDistribution { get; set; }
        public Dictionary<string, object> ModelRankings { get; set; }
        public int RankingSize { get; set; }
        public string? StartTime { get; set; }
        public Dictionary<string, object> Summary { get; set; }
        public string TimeRange { get; set; }
        public List<Dictionary<string, object>> Trend { get; set; }
        public Dictionary<string, object> UserRankings { get; set; }
    }
}
