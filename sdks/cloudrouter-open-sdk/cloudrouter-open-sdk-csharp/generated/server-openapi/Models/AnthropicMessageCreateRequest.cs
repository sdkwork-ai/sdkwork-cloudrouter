using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AnthropicMessageCreateRequest
    {
        public AnthropicCacheControl? CacheControl { get; set; }
        public AnthropicContainer? Container { get; set; }
        public AnthropicDiagnostics? Diagnostics { get; set; }
        public string? InferenceGeo { get; set; }
        public int MaxTokens { get; set; }
        public List<AnthropicMessageParam> Messages { get; set; }
        public AnthropicMetadata? Metadata { get; set; }
        public string Model { get; set; }
        public AnthropicOutputConfig? OutputConfig { get; set; }
        public string? ServiceTier { get; set; }
        public string? Speed { get; set; }
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
