using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiResponseInputTokenCountRequest
    {
        public string? Conversation { get; set; }
        public string? Input { get; set; }
        public string? Instructions { get; set; }
        public string? Model { get; set; }
        public bool? ParallelToolCalls { get; set; }
        public string? Personality { get; set; }
        public string? PreviousResponseId { get; set; }
        public string? Reasoning { get; set; }
        public string? Text { get; set; }
        public string? ToolChoice { get; set; }
        public List<string>? Tools { get; set; }
        public string? Truncation { get; set; }
    }
}
