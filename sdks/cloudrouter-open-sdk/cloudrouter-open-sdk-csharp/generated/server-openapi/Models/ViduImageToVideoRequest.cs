using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ViduImageToVideoRequest
    {
        public bool? Audio { get; set; }
        public string? CallbackUrl { get; set; }
        public int? Duration { get; set; }
        public List<string> Images { get; set; }
        public bool? IsRec { get; set; }
        public string? MetaData { get; set; }
        public string Model { get; set; }
        public bool? OffPeak { get; set; }
        public string? Payload { get; set; }
        public string? Prompt { get; set; }
        public string? Resolution { get; set; }
        public int? Seed { get; set; }
        public bool? Watermark { get; set; }
        public int? WmPosition { get; set; }
        public string? WmUrl { get; set; }
    }
}
