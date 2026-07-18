using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class KlingVideoGenerationRequest
    {
        public string? AspectRatio { get; set; }
        public string? CallbackUrl { get; set; }
        public double? CfgScale { get; set; }
        public int? Duration { get; set; }
        public string? Image { get; set; }
        public string? ImageTail { get; set; }
        public string? Mode { get; set; }
        public string? Model { get; set; }
        public string? NegativePrompt { get; set; }
        public string Prompt { get; set; }
    }
}
