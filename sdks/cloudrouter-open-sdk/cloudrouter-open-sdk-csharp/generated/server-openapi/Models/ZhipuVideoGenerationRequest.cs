using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ZhipuVideoGenerationRequest
    {
        public int? Duration { get; set; }
        public int? Fps { get; set; }
        public string? ImageUrl { get; set; }
        public string Model { get; set; }
        public string? Prompt { get; set; }
        public string? Quality { get; set; }
        public string? RequestId { get; set; }
        public string? Size { get; set; }
        public string? UserId { get; set; }
        public bool? WatermarkEnabled { get; set; }
        public bool? WithAudio { get; set; }
    }
}
