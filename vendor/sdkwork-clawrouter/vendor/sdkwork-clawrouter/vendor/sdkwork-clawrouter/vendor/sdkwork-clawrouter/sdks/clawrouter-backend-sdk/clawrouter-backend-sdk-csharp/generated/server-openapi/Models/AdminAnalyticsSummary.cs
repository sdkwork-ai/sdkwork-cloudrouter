using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAnalyticsSummary
    {
        public string ActiveModels { get; set; }
        public string ActiveUsers { get; set; }
        public double AveragePointsPerRequest { get; set; }
        public double AverageTokensPerRequest { get; set; }
        public double ErrorRate { get; set; }
        public string FailedRequests { get; set; }
        public string SuccessfulRequests { get; set; }
        public double TotalPoints { get; set; }
        public string TotalRequests { get; set; }
        public double TotalTokens { get; set; }
        public string TotalUsers { get; set; }
        public double UpstreamCost { get; set; }
    }
}
