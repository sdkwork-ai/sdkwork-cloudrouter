using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminPromptBindingItem
    {
        public string BindingRole { get; set; }
        public string CreatedAt { get; set; }
        public bool Enabled { get; set; }
        public string Id { get; set; }
        public string OrganizationId { get; set; }
        public string OwnerId { get; set; }
        public string OwnerType { get; set; }
        public Dictionary<string, string> PolicyJson { get; set; }
        public int Priority { get; set; }
        public string PromptId { get; set; }
        public string? PromptVersionId { get; set; }
        public Dictionary<string, string> SnapshotJson { get; set; }
        public string TenantId { get; set; }
        public string UpdatedAt { get; set; }
        public string Uuid { get; set; }
    }
}
