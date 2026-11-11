using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiRunCreateRequest
    {
        public string? AdditionalInstructions { get; set; }
        public List<OpenAiThreadMessageCreateRequest>? AdditionalMessages { get; set; }
        public string AssistantId { get; set; }
        public string? Instructions { get; set; }
        public int? MaxCompletionTokens { get; set; }
        public int? MaxPromptTokens { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public bool? ParallelToolCalls { get; set; }
        public string? ReasoningEffort { get; set; }
        public string? ResponseFormat { get; set; }
        public bool? Stream { get; set; }
        public double? Temperature { get; set; }
        public string? ToolChoice { get; set; }
        public List<string>? Tools { get; set; }
        public double? TopP { get; set; }
        public string? TruncationStrategy { get; set; }
    }
}
