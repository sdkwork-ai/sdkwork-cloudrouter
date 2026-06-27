using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminRuntimeRouteExplainCandidate
    {
        public string ApiCode { get; set; }
        public string CatalogKey { get; set; }
        public string ChannelGroupCode { get; set; }
        public string ChannelGroupId { get; set; }
        public string ChannelId { get; set; }
        public string CredentialId { get; set; }
        public string CredentialRotation { get; set; }
        public string Kind { get; set; }
        public string PolicyId { get; set; }
        public string PricingPlanCode { get; set; }
        public string ProviderCode { get; set; }
        public string ProviderModel { get; set; }
        public string RegionCode { get; set; }
        public string RequestedModel { get; set; }
        public string RuleId { get; set; }
        public int TimeoutMs { get; set; }
    }
}
