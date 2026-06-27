using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RoutingApiKeyItem
    {
        public string? CopyableKey { get; set; }
        public string CreatedAt { get; set; }
        public string DisplayKey { get; set; }
        public string Id { get; set; }
        public string Name { get; set; }
        public string Status { get; set; }
        public string TotalUsage { get; set; }
    }
}
