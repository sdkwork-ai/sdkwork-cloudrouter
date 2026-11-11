using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiResponseCompactRequest
    {
        public Dictionary<string, string>? Image { get; set; }
        public string? Input { get; set; }
        public string? Instructions { get; set; }
        public string Model { get; set; }
        public string? PreviousResponseId { get; set; }
        public string? PromptCacheKey { get; set; }
        public Dictionary<string, string>? PromptCacheOptions { get; set; }
        public string? PromptCacheRetention { get; set; }
        public string? ServiceTier { get; set; }
    }
}
