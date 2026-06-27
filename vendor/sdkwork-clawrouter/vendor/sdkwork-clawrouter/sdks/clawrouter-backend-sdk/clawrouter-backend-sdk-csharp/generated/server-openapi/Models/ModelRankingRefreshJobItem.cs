using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelRankingRefreshJobItem
    {
        public string DurationMs { get; set; }
        public string EndedAt { get; set; }
        public string FailureCount { get; set; }
        public string FailureReason { get; set; }
        public string GeneratedCount { get; set; }
        public string Id { get; set; }
        public string JobName { get; set; }
        public string NextRefreshAt { get; set; }
        public string OrganizationId { get; set; }
        public string RankScope { get; set; }
        public string SnapshotDate { get; set; }
        public string SnapshotPeriod { get; set; }
        public string SourceCount { get; set; }
        public string StartedAt { get; set; }
        public string Status { get; set; }
        public string SuccessCount { get; set; }
        public string TenantId { get; set; }
        public string WindowEnd { get; set; }
        public string WindowStart { get; set; }
    }
}
