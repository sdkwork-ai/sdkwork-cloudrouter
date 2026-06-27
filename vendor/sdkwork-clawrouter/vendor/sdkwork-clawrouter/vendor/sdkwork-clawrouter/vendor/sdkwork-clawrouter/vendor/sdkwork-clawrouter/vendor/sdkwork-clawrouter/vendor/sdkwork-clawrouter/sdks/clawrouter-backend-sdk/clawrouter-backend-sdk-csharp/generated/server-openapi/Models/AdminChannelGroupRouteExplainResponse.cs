using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminChannelGroupRouteExplainResponse
    {
        public int ActiveHealthyBindingCount { get; set; }
        public List<string> ApiScope { get; set; }
        public List<string> Capabilities { get; set; }
        public int ConfiguredResourceAccessCount { get; set; }
        public int ConfiguredResourceGroupAccessCount { get; set; }
        public List<string> EffectiveResourceCodes { get; set; }
        public List<string> IssueCodes { get; set; }
        public List<AdminChannelGroupRouteExplainIssue> Issues { get; set; }
        public bool Ready { get; set; }
        public List<string> ResourceCodes { get; set; }
        public List<string> ResourceGroupCodes { get; set; }
        public int RoutableBindingCount { get; set; }
        public string Source { get; set; }
    }
}
