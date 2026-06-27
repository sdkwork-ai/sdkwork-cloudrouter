using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ChatConversationCreateRequest
    {
        public string? AgentId { get; set; }
        public string? AgentSessionId { get; set; }
        public string? DefaultModel { get; set; }
        public string? DefaultProvider { get; set; }
        public string? MemorySpaceId { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? SourceSurface { get; set; }
        public string? Title { get; set; }
    }
}
