using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ViduTimingToAudioRequest
    {
        public bool? Bgm { get; set; }
        public string? CallbackUrl { get; set; }
        public double? Duration { get; set; }
        public string Model { get; set; }
        public bool? OffPeak { get; set; }
        public string? Payload { get; set; }
        public int? Seed { get; set; }
        public List<Dictionary<string, string>> TimingPrompts { get; set; }
    }
}
