using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminRuntimeRouteExplainResponse
    {
        public string ApiCode { get; set; }
        public string ApiKeyId { get; set; }
        public string BillingMeter { get; set; }
        public List<AdminRuntimeRouteExplainIssue> BlockedReasons { get; set; }
        public int CandidateCount { get; set; }
        public string Capability { get; set; }
        public string CatalogKey { get; set; }
        public string ChannelGroupId { get; set; }
        public string GroupCode { get; set; }
        public string Model { get; set; }
        public string PolicyId { get; set; }
        public string PolicySnapshotVersion { get; set; }
        public string PricingPlanCode { get; set; }
        public bool Ready { get; set; }
        public string ResourceCode { get; set; }
        public string RuleId { get; set; }
        public List<AdminRuntimeRouteExplainCandidate> SelectedCandidates { get; set; }
        public string Source { get; set; }
        public List<AdminRuntimeRouteExplainIssue> Warnings { get; set; }
    }
}
