using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiVectorStore
    {
        public int? Bytes { get; set; }
        public int CreatedAt { get; set; }
        public string? ExpiresAfter { get; set; }
        public int? ExpiresAt { get; set; }
        public OpenAiVectorStoreFileCounts? FileCounts { get; set; }
        public string Id { get; set; }
        public int? LastActiveAt { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Name { get; set; }
        public string Object { get; set; }
        public string Status { get; set; }
        public int? UsageBytes { get; set; }
    }
}
