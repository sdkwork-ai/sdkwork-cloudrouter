using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiVectorStoreCreateRequest
    {
        public string? ChunkingStrategy { get; set; }
        public string? ExpiresAfter { get; set; }
        public List<string>? FileIds { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Name { get; set; }
    }
}
