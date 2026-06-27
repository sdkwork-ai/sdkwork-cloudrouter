using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ChatTurnResponseRequest
    {
        public string Message { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public string? Provider { get; set; }
        public string? Runtime { get; set; }
        public string? RuntimeInvocationId { get; set; }
        public string? Status { get; set; }
        public Dictionary<string, object>? Usage { get; set; }
        public string? UsageFactId { get; set; }
    }
}
