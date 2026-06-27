using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelRankingRefreshTriggerResponse
    {
        public string CacheMaxAgeSeconds { get; set; }
        public string GeneratedCount { get; set; }
        public string NextRefreshAt { get; set; }
        public string OrganizationId { get; set; }
        public string RankScope { get; set; }
        public string RefreshIntervalSeconds { get; set; }
        public string SnapshotDate { get; set; }
        public string SnapshotPeriod { get; set; }
        public string SourceCount { get; set; }
        public string Status { get; set; }
        public string TenantId { get; set; }
        public bool Triggered { get; set; }
        public string WindowEnd { get; set; }
        public string WindowStart { get; set; }
    }
}
