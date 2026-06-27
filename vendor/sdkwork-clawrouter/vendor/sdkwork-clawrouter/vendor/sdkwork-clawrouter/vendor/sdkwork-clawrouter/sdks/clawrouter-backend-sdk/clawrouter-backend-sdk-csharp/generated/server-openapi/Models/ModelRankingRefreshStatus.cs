using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelRankingRefreshStatus
    {
        public string CacheMaxAgeSeconds { get; set; }
        public string GeneratedAt { get; set; }
        public string GeneratedCount { get; set; }
        public ModelRankingRefreshLatestJob LatestJob { get; set; }
        public string NextRefreshAt { get; set; }
        public string OrganizationId { get; set; }
        public string RankScope { get; set; }
        public string RefreshIntervalSeconds { get; set; }
        public string SnapshotDate { get; set; }
        public string SnapshotPeriod { get; set; }
        public string SourceCount { get; set; }
        public List<string> SourceTables { get; set; }
        public string Status { get; set; }
        public string TenantId { get; set; }
        public string WindowEnd { get; set; }
        public string WindowStart { get; set; }
    }
}
