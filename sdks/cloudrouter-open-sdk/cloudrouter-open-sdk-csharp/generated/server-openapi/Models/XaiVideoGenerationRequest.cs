using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class XaiVideoGenerationRequest
    {
        public string? AspectRatio { get; set; }
        public int? Duration { get; set; }
        public XaiImageUrl? Image { get; set; }
        public List<XaiImageUrl>? Keyframes { get; set; }
        public string? Model { get; set; }
        public Dictionary<string, string>? Output { get; set; }
        public string? Prompt { get; set; }
        public List<string>? ReferenceAudios { get; set; }
        public List<XaiImageUrl>? ReferenceImages { get; set; }
        public string? Resolution { get; set; }
        public Dictionary<string, string>? StorageOptions { get; set; }
        public string? User { get; set; }
    }
}
