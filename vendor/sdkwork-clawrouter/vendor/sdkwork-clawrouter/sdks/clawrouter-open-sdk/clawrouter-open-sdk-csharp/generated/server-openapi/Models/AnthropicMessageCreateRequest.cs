using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class AnthropicMessageCreateRequest
    {
        public int? MaxTokens { get; set; }
        public List<AnthropicMessageParam>? Messages { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public List<string>? StopSequences { get; set; }
        public bool? Stream { get; set; }
        public string? System { get; set; }
        public double? Temperature { get; set; }
        public AnthropicThinkingConfig? Thinking { get; set; }
        public AnthropicToolChoice? ToolChoice { get; set; }
        public List<AnthropicTool>? Tools { get; set; }
        public int? TopK { get; set; }
        public double? TopP { get; set; }
    }
}
