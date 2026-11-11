using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AnthropicCountMessageTokensRequest
    {
        public AnthropicCacheControl? CacheControl { get; set; }
        public List<AnthropicMessageParam> Messages { get; set; }
        public string Model { get; set; }
        public AnthropicOutputConfig? OutputConfig { get; set; }
        public string? Speed { get; set; }
        public string? System { get; set; }
        public AnthropicThinkingConfig? Thinking { get; set; }
        public AnthropicToolChoice? ToolChoice { get; set; }
        public List<AnthropicTool>? Tools { get; set; }
    }
}
