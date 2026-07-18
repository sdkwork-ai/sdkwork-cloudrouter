using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiVectorStoreFileCreateRequest
    {
        public Dictionary<string, string>? Attributes { get; set; }
        public string? ChunkingStrategy { get; set; }
        public string FileId { get; set; }
    }
}
