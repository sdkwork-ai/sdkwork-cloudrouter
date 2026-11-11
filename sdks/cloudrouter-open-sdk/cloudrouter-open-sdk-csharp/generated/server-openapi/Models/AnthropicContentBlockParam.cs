using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AnthropicContentBlockParam
    {
        public AnthropicCacheControl? CacheControl { get; set; }
        public Dictionary<string, string>? Caller { get; set; }
        public List<Dictionary<string, string>>? Citations { get; set; }
        public string? Content { get; set; }
        public string? Context { get; set; }
        public string? Data { get; set; }
        public string? Id { get; set; }
        public Dictionary<string, string>? Input { get; set; }
        public bool? IsError { get; set; }
        public string? Name { get; set; }
        public string? Signature { get; set; }
        public AnthropicContentSource? Source { get; set; }
        public string? Text { get; set; }
        public string? Thinking { get; set; }
        public string? Title { get; set; }
        public string? ToolUseId { get; set; }
        public string? ToolsetName { get; set; }
        public string Type { get; set; }
    }
}
