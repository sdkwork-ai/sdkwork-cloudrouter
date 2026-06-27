using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ChatTurnCreateRequest
    {
        public string? AgentId { get; set; }
        public string? AgentSessionId { get; set; }
        public string Message { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Mode { get; set; }
        public string? Model { get; set; }
        public string? Provider { get; set; }
    }
}
