using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AnthropicUsage
    {
        public int? CacheCreationInputTokens { get; set; }
        public int? CacheReadInputTokens { get; set; }
        public int? InputTokens { get; set; }
        public int? OutputTokens { get; set; }
    }
}
