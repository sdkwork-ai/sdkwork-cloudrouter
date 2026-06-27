using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMcpBindingItem
    {
        public List<string> AllowedTools { get; set; }
        public string CreatedAt { get; set; }
        public List<string> DeniedTools { get; set; }
        public bool Enabled { get; set; }
        public string Id { get; set; }
        public string OrganizationId { get; set; }
        public string OwnerId { get; set; }
        public string OwnerType { get; set; }
        public Dictionary<string, string> PolicyJson { get; set; }
        public int Priority { get; set; }
        public string ServerId { get; set; }
        public string? ServerRevisionId { get; set; }
        public Dictionary<string, string> SnapshotJson { get; set; }
        public string Status { get; set; }
        public string TenantId { get; set; }
        public string? ToolId { get; set; }
        public string UpdatedAt { get; set; }
        public string Uuid { get; set; }
    }
}
