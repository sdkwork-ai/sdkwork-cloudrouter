using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MinimaxImageGenerationRequest
    {
        public string? AspectRatio { get; set; }
        public int? Height { get; set; }
        public string Model { get; set; }
        public int? N { get; set; }
        public string Prompt { get; set; }
        public bool? PromptOptimizer { get; set; }
        public string? ResponseFormat { get; set; }
        public int? Seed { get; set; }
        public List<Dictionary<string, string>>? SubjectReference { get; set; }
        public int? Width { get; set; }
    }
}
