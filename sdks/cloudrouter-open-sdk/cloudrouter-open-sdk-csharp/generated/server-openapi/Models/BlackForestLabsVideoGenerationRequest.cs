using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class BlackForestLabsVideoGenerationRequest
    {
        public string? AspectRatio { get; set; }
        public bool? Draft { get; set; }
        public string? DraftCache { get; set; }
        public int? Duration { get; set; }
        public bool? GenerateAudio { get; set; }
        public string? Keyframes { get; set; }
        public string Mode { get; set; }
        public string? Prompt { get; set; }
        public string? Resolution { get; set; }
        public int? SafetyTolerance { get; set; }
        public string? StartVideo { get; set; }
        public string? User { get; set; }
        public string? Version { get; set; }
    }
}
