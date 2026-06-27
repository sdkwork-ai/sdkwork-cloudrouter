using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminSiteChannelItem
    {
        public string ChannelCode { get; set; }
        public string ChannelName { get; set; }
        public string HealthStatus { get; set; }
        public string Id { get; set; }
        public string? ProviderCode { get; set; }
        public string? SiteChannelRole { get; set; }
        public string? SiteCode { get; set; }
        public string? SiteServiceCode { get; set; }
        public string Status { get; set; }
    }
}
