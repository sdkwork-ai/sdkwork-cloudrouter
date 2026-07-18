using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class AnthropicFile
    {
        public string CreatedAt { get; set; }
        public bool? Downloadable { get; set; }
        public string Filename { get; set; }
        public string Id { get; set; }
        public string MimeType { get; set; }
        public int SizeBytes { get; set; }
        public string Type { get; set; }
    }
}
