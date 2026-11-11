using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ViduImageGenerationTask
    {
        public string? AspectRatio { get; set; }
        public string? CallbackUrl { get; set; }
        public string? CreatedAt { get; set; }
        public List<ViduCreation>? Creations { get; set; }
        public int? Credits { get; set; }
        public int? Duration { get; set; }
        public string? ErrCode { get; set; }
        public List<string>? Images { get; set; }
        public string? Model { get; set; }
        public bool? OffPeak { get; set; }
        public string? Payload { get; set; }
        public string? Prompt { get; set; }
        public string? Resolution { get; set; }
        public int? Seed { get; set; }
        public string? State { get; set; }
        public string? TaskId { get; set; }
        public bool? Watermark { get; set; }
    }
}
