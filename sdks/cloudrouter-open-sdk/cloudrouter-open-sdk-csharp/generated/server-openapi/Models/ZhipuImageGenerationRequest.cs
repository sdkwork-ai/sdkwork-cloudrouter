using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ZhipuImageGenerationRequest
    {
        public string Model { get; set; }
        public string Prompt { get; set; }
        public string? Quality { get; set; }
        public string? Size { get; set; }
        public string? UserId { get; set; }
        public bool? WatermarkEnabled { get; set; }
    }
}
