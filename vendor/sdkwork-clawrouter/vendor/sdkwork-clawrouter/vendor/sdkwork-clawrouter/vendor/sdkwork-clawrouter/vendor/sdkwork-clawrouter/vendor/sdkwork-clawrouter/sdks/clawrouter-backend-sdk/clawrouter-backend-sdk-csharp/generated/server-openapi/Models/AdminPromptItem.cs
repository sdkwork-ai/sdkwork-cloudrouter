using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminPromptItem
    {
        public string? CategoryCode { get; set; }
        public string? CategoryId { get; set; }
        public string CreatedAt { get; set; }
        public string? Description { get; set; }
        public string Id { get; set; }
        public string? LatestVersionId { get; set; }
        public string Name { get; set; }
        public string OrganizationId { get; set; }
        public string? OwnerUserId { get; set; }
        public string PromptKey { get; set; }
        public string PromptType { get; set; }
        public string? PublishedVersionId { get; set; }
        public string Status { get; set; }
        public List<string> Tags { get; set; }
        public string TenantId { get; set; }
        public string UpdatedAt { get; set; }
        public string Uuid { get; set; }
        public string Visibility { get; set; }
    }
}
