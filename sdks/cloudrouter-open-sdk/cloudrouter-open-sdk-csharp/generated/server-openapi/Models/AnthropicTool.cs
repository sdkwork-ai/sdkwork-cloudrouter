using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AnthropicTool
    {
        public List<string>? AllowedCallers { get; set; }
        public AnthropicCacheControl? CacheControl { get; set; }
        public bool? DeferLoading { get; set; }
        public string? Description { get; set; }
        public bool? EagerInputStreaming { get; set; }
        public List<Dictionary<string, string>>? InputExamples { get; set; }
        public ProviderJsonSchema InputSchema { get; set; }
        public string Name { get; set; }
        public bool? Strict { get; set; }
        public string? Type { get; set; }
    }
}
