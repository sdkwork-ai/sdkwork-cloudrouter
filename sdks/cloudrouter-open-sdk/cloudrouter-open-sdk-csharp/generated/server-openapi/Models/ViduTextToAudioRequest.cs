using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ViduTextToAudioRequest
    {
        public bool? Bgm { get; set; }
        public string? CallbackUrl { get; set; }
        public double? Duration { get; set; }
        public string Model { get; set; }
        public bool? OffPeak { get; set; }
        public string? Payload { get; set; }
        public string Prompt { get; set; }
        public int? Seed { get; set; }
    }
}
