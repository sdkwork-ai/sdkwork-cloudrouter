using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class StabilityImageGenerationRequest
    {
        public string? AspectRatio { get; set; }
        public double? CfgScale { get; set; }
        public string? Image { get; set; }
        public string? Mode { get; set; }
        public string? Model { get; set; }
        public string? NegativePrompt { get; set; }
        public string? OutputFormat { get; set; }
        public string Prompt { get; set; }
        public int? Seed { get; set; }
        public double? Strength { get; set; }
        public string? StylePreset { get; set; }
    }
}
