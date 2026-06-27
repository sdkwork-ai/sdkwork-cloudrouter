using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminPromptVersionItem
    {
        public string ChecksumHash { get; set; }
        public string Content { get; set; }
        public string CreatedAt { get; set; }
        public string CreatedBy { get; set; }
        public List<Dictionary<string, string>> ExamplesJson { get; set; }
        public string Id { get; set; }
        public string LifecycleStatus { get; set; }
        public Dictionary<string, string> ModelConstraints { get; set; }
        public string OrganizationId { get; set; }
        public Dictionary<string, string> OutputSchema { get; set; }
        public string PromptId { get; set; }
        public string? PublishedAt { get; set; }
        public string? ReviewComment { get; set; }
        public string ReviewStatus { get; set; }
        public Dictionary<string, string> SafetyPolicy { get; set; }
        public string TenantId { get; set; }
        public string Title { get; set; }
        public string UpdatedAt { get; set; }
        public string Uuid { get; set; }
        public Dictionary<string, string> VariableSchema { get; set; }
        public string VersionNo { get; set; }
    }
}
