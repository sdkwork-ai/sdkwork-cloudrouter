using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiRun
    {
        public string AssistantId { get; set; }
        public int? CancelledAt { get; set; }
        public int? CompletedAt { get; set; }
        public int CreatedAt { get; set; }
        public int? ExpiresAt { get; set; }
        public int? FailedAt { get; set; }
        public string Id { get; set; }
        public string? Instructions { get; set; }
        public string? LastError { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public string Object { get; set; }
        public string? RequiredAction { get; set; }
        public int? StartedAt { get; set; }
        public string Status { get; set; }
        public string ThreadId { get; set; }
        public List<string>? Tools { get; set; }
        public OpenAiTokenUsage? Usage { get; set; }
    }
}
