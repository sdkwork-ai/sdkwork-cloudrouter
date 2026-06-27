using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class ViduCreation
    {
        public string? AudioUrl { get; set; }
        public string? CoverUrl { get; set; }
        public string? CreatedAt { get; set; }
        public double? Duration { get; set; }
        public int? Height { get; set; }
        public string? Id { get; set; }
        public string? ImageUrl { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Type { get; set; }
        public string? Uri { get; set; }
        public string? Url { get; set; }
        public string? VideoUrl { get; set; }
        public int? Width { get; set; }
    }
}
