using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiThreadMessage
    {
        public string? AssistantId { get; set; }
        public List<string>? Attachments { get; set; }
        public int? CompletedAt { get; set; }
        public List<string>? Content { get; set; }
        public int? CreatedAt { get; set; }
        public string? Id { get; set; }
        public int? IncompleteAt { get; set; }
        public string? IncompleteDetails { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Object { get; set; }
        public string? Role { get; set; }
        public string? RunId { get; set; }
        public string? Status { get; set; }
        public string? ThreadId { get; set; }
    }
}
