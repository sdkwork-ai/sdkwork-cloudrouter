using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMcpToolItem
    {
        public string CreatedAt { get; set; }
        public string? Description { get; set; }
        public string? DiscoveredAt { get; set; }
        public bool Enabled { get; set; }
        public string Id { get; set; }
        public Dictionary<string, string> InputSchema { get; set; }
        public string? LastInvokedAt { get; set; }
        public string Name { get; set; }
        public string OrganizationId { get; set; }
        public Dictionary<string, string> OutputSchema { get; set; }
        public Dictionary<string, string> RateLimitPolicy { get; set; }
        public bool RequiresApproval { get; set; }
        public string RiskLevel { get; set; }
        public string SchemaHash { get; set; }
        public string ServerId { get; set; }
        public string? ServerRevisionId { get; set; }
        public int SortWeight { get; set; }
        public string Status { get; set; }
        public string TenantId { get; set; }
        public string ToolKey { get; set; }
        public string UpdatedAt { get; set; }
        public string Uuid { get; set; }
    }
}
