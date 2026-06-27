using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAnalyticsOverviewResponse
    {
        public string? EndTime { get; set; }
        public List<AdminAnalyticsInsight> Insights { get; set; }
        public string Limit { get; set; }
        public List<AdminPieChartItem> ModalityDistribution { get; set; }
        public List<AdminPieChartItem> ModelDistribution { get; set; }
        public AdminAnalyticsModelRankings ModelRankings { get; set; }
        public string? StartTime { get; set; }
        public AdminAnalyticsSummary Summary { get; set; }
        public string TimeRange { get; set; }
        public List<AdminAnalyticsTrendPoint> Trend { get; set; }
        public AdminAnalyticsUserRankings UserRankings { get; set; }
    }
}
