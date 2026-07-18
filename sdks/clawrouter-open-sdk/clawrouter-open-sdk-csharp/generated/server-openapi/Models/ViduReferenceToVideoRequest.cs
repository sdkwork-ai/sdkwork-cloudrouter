using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class ViduReferenceToVideoRequest
    {
        public string? AspectRatio { get; set; }
        public string? CallbackUrl { get; set; }
        public int? Duration { get; set; }
        public List<string> Images { get; set; }
        public string Model { get; set; }
        public string? MovementAmplitude { get; set; }
        public string? Payload { get; set; }
        public string? Prompt { get; set; }
        public string? Resolution { get; set; }
        public int? Seed { get; set; }
    }
}
