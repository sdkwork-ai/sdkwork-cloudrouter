using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageReconciliationRun
    {
        public string? BucketId { get; set; }
        public string? BucketName { get; set; }
        public bool? DryRun { get; set; }
        public string? FinishedAt { get; set; }
        public string Id { get; set; }
        public string? IssueCount { get; set; }
        public string? Issues { get; set; }
        public string? ProviderCode { get; set; }
        public string? ProviderId { get; set; }
        public string RunId { get; set; }
        public string? RunType { get; set; }
        public string? Scope { get; set; }
        public string? StartedAt { get; set; }
        public string Status { get; set; }
    }
}
