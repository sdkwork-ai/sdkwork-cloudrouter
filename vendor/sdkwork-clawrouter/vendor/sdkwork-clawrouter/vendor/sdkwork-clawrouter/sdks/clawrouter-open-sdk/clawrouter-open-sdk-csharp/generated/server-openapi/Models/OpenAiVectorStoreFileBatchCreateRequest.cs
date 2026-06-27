using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiVectorStoreFileBatchCreateRequest
    {
        public Dictionary<string, string>? Attributes { get; set; }
        public string? ChunkingStrategy { get; set; }
        public List<string>? FileIds { get; set; }
    }
}
