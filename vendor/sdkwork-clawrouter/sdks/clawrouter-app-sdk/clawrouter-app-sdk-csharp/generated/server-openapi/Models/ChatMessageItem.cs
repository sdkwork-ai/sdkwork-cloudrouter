using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ChatMessageItem
    {
        public string Content { get; set; }
        public string ConversationId { get; set; }
        public string CreatedAt { get; set; }
        public string Direction { get; set; }
        public string Id { get; set; }
        public string? Model { get; set; }
        public string? Provider { get; set; }
        public string Role { get; set; }
        public string? Runtime { get; set; }
        public string? RuntimeInvocationId { get; set; }
        public string Status { get; set; }
        public string? TurnId { get; set; }
        public Dictionary<string, object>? Usage { get; set; }
        public string? UsageLinkId { get; set; }
    }
}
