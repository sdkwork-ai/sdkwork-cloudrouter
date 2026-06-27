using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ChatTurnItem
    {
        public string? AgentId { get; set; }
        public string? AgentSessionId { get; set; }
        public string ConversationId { get; set; }
        public string CreatedAt { get; set; }
        public string Id { get; set; }
        public string? Model { get; set; }
        public string? Provider { get; set; }
        public string Status { get; set; }
        public string UpdatedAt { get; set; }
    }
}
