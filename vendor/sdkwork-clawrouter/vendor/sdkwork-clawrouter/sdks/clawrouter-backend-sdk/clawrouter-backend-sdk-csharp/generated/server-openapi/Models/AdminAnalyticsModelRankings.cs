using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAnalyticsModelRankings
    {
        public List<AdminAnalyticsModelRankItem> Points { get; set; }
        public List<AdminAnalyticsModelRankItem> Requests { get; set; }
        public List<AdminAnalyticsModelRankItem> Tokens { get; set; }
    }
}
