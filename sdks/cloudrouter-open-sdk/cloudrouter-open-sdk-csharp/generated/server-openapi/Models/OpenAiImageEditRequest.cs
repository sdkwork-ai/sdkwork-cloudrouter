using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiImageEditRequest
    {
        public string? Background { get; set; }
        public string? Complexity { get; set; }
        public int? FrameCount { get; set; }
        public int? FrameDurationMs { get; set; }
        public List<OpenAiImageReferenceInput> Images { get; set; }
        public string? InputFidelity { get; set; }
        public Dictionary<string, string>? Markup { get; set; }
        public Dictionary<string, string>? Mask { get; set; }
        public string? Model { get; set; }
        public string? Moderation { get; set; }
        public int? N { get; set; }
        public int? OutputCompression { get; set; }
        public string? OutputFormat { get; set; }
        public int? PartialImages { get; set; }
        public string Prompt { get; set; }
        public string? Quality { get; set; }
        public string? SafetyIdentifier { get; set; }
        public string? Size { get; set; }
        public bool? Stream { get; set; }
        public Dictionary<string, string>? Svg { get; set; }
        public string? User { get; set; }
    }
}
