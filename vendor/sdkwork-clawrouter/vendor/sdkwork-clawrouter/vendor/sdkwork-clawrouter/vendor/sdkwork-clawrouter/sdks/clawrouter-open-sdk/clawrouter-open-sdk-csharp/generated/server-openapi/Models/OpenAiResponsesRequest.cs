using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiResponsesRequest
    {
        public bool? Background { get; set; }
        public string? Conversation { get; set; }
        public List<string>? Include { get; set; }
        public string? Input { get; set; }
        public string? Instructions { get; set; }
        public int? MaxOutputTokens { get; set; }
        public int? MaxToolCalls { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public bool? ParallelToolCalls { get; set; }
        public string? PreviousResponseId { get; set; }
        public OpenAiPromptReference? Prompt { get; set; }
        public string? PromptCacheKey { get; set; }
        public OpenAiReasoningConfig? Reasoning { get; set; }
        public string? ServiceTier { get; set; }
        public bool? Store { get; set; }
        public bool? Stream { get; set; }
        public double? Temperature { get; set; }
        public OpenAiTextConfig? Text { get; set; }
        public OpenAiToolChoice? ToolChoice { get; set; }
        public List<OpenAiTool>? Tools { get; set; }
        public int? TopLogprobs { get; set; }
        public double? TopP { get; set; }
        public string? Truncation { get; set; }
        public string? User { get; set; }
    }
}
