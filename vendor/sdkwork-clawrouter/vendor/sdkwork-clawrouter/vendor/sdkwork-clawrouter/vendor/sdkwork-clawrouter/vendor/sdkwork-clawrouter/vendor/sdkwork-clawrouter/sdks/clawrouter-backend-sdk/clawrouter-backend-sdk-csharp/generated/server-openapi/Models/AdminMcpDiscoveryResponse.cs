using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMcpDiscoveryResponse
    {
        public string CheckedAt { get; set; }
        public string DiscoveredCount { get; set; }
        public string ServerId { get; set; }
        public List<AdminMcpToolItem> Tools { get; set; }
    }
}
