using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ChatConversationItem
    {
        public string? AgentId { get; set; }
        public string? AgentSessionId { get; set; }
        public string CreatedAt { get; set; }
        public string? DefaultModel { get; set; }
        public string? DefaultProvider { get; set; }
        public string Id { get; set; }
        public string? LastMessagePreview { get; set; }
        public string? MemorySpaceId { get; set; }
        public string MessageCount { get; set; }
        public string SourceSurface { get; set; }
        public string Status { get; set; }
        public string Title { get; set; }
        public string TurnCount { get; set; }
        public string UpdatedAt { get; set; }
    }
}
