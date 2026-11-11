using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class JimengVideoGenerationRequest
    {
        public string? CallbackUrl { get; set; }
        public int? Duration { get; set; }
        public int? Fps { get; set; }
        public string? Image { get; set; }
        public string Model { get; set; }
        public string Prompt { get; set; }
        public string? Ratio { get; set; }
        public int? Seed { get; set; }
    }
}
