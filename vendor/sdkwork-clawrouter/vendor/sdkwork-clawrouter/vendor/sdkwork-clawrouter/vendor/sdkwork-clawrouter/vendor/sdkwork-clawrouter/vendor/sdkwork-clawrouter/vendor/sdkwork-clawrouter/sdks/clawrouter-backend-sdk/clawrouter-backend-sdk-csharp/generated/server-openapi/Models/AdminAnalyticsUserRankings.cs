using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAnalyticsUserRankings
    {
        public List<AdminAnalyticsUserRankItem> Points { get; set; }
        public List<AdminAnalyticsUserRankItem> Requests { get; set; }
        public List<AdminAnalyticsUserRankItem> Tokens { get; set; }
    }
}
