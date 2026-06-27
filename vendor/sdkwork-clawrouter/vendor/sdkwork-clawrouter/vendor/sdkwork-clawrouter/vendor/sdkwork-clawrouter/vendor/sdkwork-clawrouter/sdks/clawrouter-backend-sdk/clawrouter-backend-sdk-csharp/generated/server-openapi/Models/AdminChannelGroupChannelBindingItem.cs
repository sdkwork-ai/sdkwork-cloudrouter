using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminChannelGroupChannelBindingItem
    {
        public List<string> ApiScope { get; set; }
        public List<string> Capabilities { get; set; }
        public string ChannelCode { get; set; }
        public string ChannelGroupId { get; set; }
        public string ChannelId { get; set; }
        public string ChannelName { get; set; }
        public string HealthStatus { get; set; }
        public string Id { get; set; }
        public int Priority { get; set; }
        public string ProviderCode { get; set; }
        public string ProviderName { get; set; }
        public List<string> ResourceCodes { get; set; }
        public string Status { get; set; }
        public int Weight { get; set; }
    }
}
