using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class NanoBananaImageGenerationRequest
    {
        public string? AspectRatio { get; set; }
        public string? CallbackUrl { get; set; }
        public List<string>? Images { get; set; }
        public string? Model { get; set; }
        public string? Prompt { get; set; }
        public int? Seed { get; set; }
        public string? Size { get; set; }
    }
}
