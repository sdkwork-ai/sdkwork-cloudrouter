using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class AppApiKeyItem
    {
        public string ChannelGroup { get; set; }
        public string? ChannelGroupName { get; set; }
        public string? CopyableKey { get; set; }
        public string Created { get; set; }
        public bool DefaultForRuntime { get; set; }
        public string Expires { get; set; }
        public string Id { get; set; }
        public string IpLimit { get; set; }
        public string MaskedKey { get; set; }
        public List<string> Modalities { get; set; }
        public string Name { get; set; }
        public string Quota { get; set; }
        public string? Rate { get; set; }
        public string Status { get; set; }
        public string UsedQuota { get; set; }
    }
}
