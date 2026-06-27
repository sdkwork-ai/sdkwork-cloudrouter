using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiContainer
    {
        public int? CreatedAt { get; set; }
        public int? ExpiresAt { get; set; }
        public string? Id { get; set; }
        public int? LastActiveAt { get; set; }
        public string? MemoryLimit { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Name { get; set; }
        public string? Object { get; set; }
        public string? Status { get; set; }
    }
}
