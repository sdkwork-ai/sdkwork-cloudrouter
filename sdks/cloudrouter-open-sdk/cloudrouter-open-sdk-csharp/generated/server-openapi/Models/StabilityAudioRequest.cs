using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class StabilityAudioRequest
    {
        public double? CfgScale { get; set; }
        public double? Duration { get; set; }
        public string? Model { get; set; }
        public string? OutputFormat { get; set; }
        public string Prompt { get; set; }
        public int? Seed { get; set; }
        public int? Steps { get; set; }
    }
}
