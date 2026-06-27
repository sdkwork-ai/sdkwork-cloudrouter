using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMcpToolUpdateRequest
    {
        public string? Description { get; set; }
        public bool? Enabled { get; set; }
        public Dictionary<string, string>? InputSchema { get; set; }
        public string? Name { get; set; }
        public Dictionary<string, string>? OutputSchema { get; set; }
        public Dictionary<string, string>? RateLimitPolicy { get; set; }
        public bool? RequiresApproval { get; set; }
        public string? RiskLevel { get; set; }
        public int? SortWeight { get; set; }
        public string? Status { get; set; }
    }
}
