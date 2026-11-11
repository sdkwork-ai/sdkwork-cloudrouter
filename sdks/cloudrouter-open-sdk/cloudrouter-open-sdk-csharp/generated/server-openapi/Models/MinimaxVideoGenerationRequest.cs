using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MinimaxVideoGenerationRequest
    {
        public string? CallbackUrl { get; set; }
        public int? Duration { get; set; }
        public bool? FastPretreatment { get; set; }
        public string? FirstFrameImage { get; set; }
        public string? LastFrameImage { get; set; }
        public string Model { get; set; }
        public string Prompt { get; set; }
        public bool? PromptOptimizer { get; set; }
        public string? Resolution { get; set; }
    }
}
