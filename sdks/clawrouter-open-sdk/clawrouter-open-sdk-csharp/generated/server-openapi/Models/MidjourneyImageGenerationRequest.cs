using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class MidjourneyImageGenerationRequest
    {
        public string? AspectRatio { get; set; }
        public string? CallbackUrl { get; set; }
        public string? Model { get; set; }
        public string Prompt { get; set; }
        public int? Seed { get; set; }
        public string? Style { get; set; }
    }
}
