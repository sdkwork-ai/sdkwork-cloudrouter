using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiVideo
    {
        public int? CompletedAt { get; set; }
        public string? ContentUrl { get; set; }
        public int? CreatedAt { get; set; }
        public string Id { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public string Object { get; set; }
        public string? Prompt { get; set; }
        public int? Seconds { get; set; }
        public string? Size { get; set; }
        public string Status { get; set; }
        public string? Url { get; set; }
    }
}
