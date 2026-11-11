using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class StabilityImageGenerationResponse
    {
        public string? FinishReason { get; set; }
        public string? Image { get; set; }
        public int? Seed { get; set; }
    }
}
