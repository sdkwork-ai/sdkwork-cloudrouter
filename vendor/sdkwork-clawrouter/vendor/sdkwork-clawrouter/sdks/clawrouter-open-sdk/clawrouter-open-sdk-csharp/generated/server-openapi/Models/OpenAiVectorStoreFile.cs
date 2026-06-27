using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiVectorStoreFile
    {
        public Dictionary<string, string>? Attributes { get; set; }
        public string? ChunkingStrategy { get; set; }
        public int? CreatedAt { get; set; }
        public string? Id { get; set; }
        public string? LastError { get; set; }
        public string? Object { get; set; }
        public string? Status { get; set; }
        public int? UsageBytes { get; set; }
        public string? VectorStoreId { get; set; }
    }
}
