using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class ProviderGeneratedMedia
    {
        public double? Duration { get; set; }
        public int? Height { get; set; }
        public string? Id { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? MimeType { get; set; }
        public string? Uri { get; set; }
        public string? Url { get; set; }
        public int? Width { get; set; }
    }
}
