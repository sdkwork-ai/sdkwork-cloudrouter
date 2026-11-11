using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiRealtimeCallActionRequest
    {
        public Dictionary<string, string>? Audio { get; set; }
        public List<string>? Include { get; set; }
        public string? Instructions { get; set; }
        public int? MaxOutputTokens { get; set; }
        public string? Model { get; set; }
        public List<string>? OutputModalities { get; set; }
        public bool? ParallelToolCalls { get; set; }
        public Dictionary<string, string>? Prompt { get; set; }
        public Dictionary<string, string>? Reasoning { get; set; }
        public string? ToolChoice { get; set; }
        public List<Dictionary<string, string>>? Tools { get; set; }
        public Dictionary<string, string>? Tracing { get; set; }
        public Dictionary<string, string>? Truncation { get; set; }
        public string Type { get; set; }
    }
}
