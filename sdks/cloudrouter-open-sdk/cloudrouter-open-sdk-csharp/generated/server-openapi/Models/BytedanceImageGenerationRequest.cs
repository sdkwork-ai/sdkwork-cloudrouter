using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class BytedanceImageGenerationRequest
    {
        public string? Background { get; set; }
        public string? Image { get; set; }
        public bool? LayerDecomposition { get; set; }
        public string Model { get; set; }
        public Dictionary<string, string>? OptimizePromptOptions { get; set; }
        public string? OutputFormat { get; set; }
        public string? Prompt { get; set; }
        public string? ResponseFormat { get; set; }
        public string? SequentialImageGeneration { get; set; }
        public Dictionary<string, string>? SequentialImageGenerationOptions { get; set; }
        public string? Size { get; set; }
        public bool? Stream { get; set; }
        public List<ArkWebSearchTool>? Tools { get; set; }
        public bool? Watermark { get; set; }
    }
}
