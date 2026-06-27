using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelRankingRefreshTriggerRequest
    {
        public string? CacheMaxAgeSeconds { get; set; }
        public string? Limit { get; set; }
        public string? LookbackDays { get; set; }
        public string? RankScope { get; set; }
        public string? RefreshIntervalSeconds { get; set; }
        public string? SnapshotPeriod { get; set; }
    }
}
