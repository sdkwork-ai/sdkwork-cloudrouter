using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class RunwayImageToVideoRequest
    {
        public bool? Audio { get; set; }
        public string? Bitrate { get; set; }
        public double? CfgScale { get; set; }
        public Dictionary<string, string>? ContentModeration { get; set; }
        public bool? Draft { get; set; }
        public int? Duration { get; set; }
        public string Model { get; set; }
        public string? NegativePrompt { get; set; }
        public string? OutputFormat { get; set; }
        public string? PromptExpansionMode { get; set; }
        public string PromptImage { get; set; }
        public string? PromptText { get; set; }
        public string? ProresProfile { get; set; }
        public Dictionary<string, string>? ProviderSettings { get; set; }
        public string? Ratio { get; set; }
        public List<Dictionary<string, string>>? ReferenceAudio { get; set; }
        public List<Dictionary<string, string>>? ReferenceVideos { get; set; }
        public List<Dictionary<string, string>>? References { get; set; }
        public string? Resolution { get; set; }
        public int? Seed { get; set; }
    }
}
