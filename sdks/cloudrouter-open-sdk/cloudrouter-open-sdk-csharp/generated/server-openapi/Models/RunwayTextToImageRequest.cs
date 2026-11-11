using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class RunwayTextToImageRequest
    {
        public string? Background { get; set; }
        public string? BackgroundColor { get; set; }
        public List<string>? Colors { get; set; }
        public Dictionary<string, string>? ContentModeration { get; set; }
        public bool? Edit { get; set; }
        public bool? Grounding { get; set; }
        public string? MaskUri { get; set; }
        public string? Model { get; set; }
        public int? OutputCount { get; set; }
        public string? OutputFormat { get; set; }
        public bool? PreciseEdit { get; set; }
        public string PromptText { get; set; }
        public string? Quality { get; set; }
        public string? Ratio { get; set; }
        public List<Dictionary<string, string>>? ReferenceImages { get; set; }
        public int? Seed { get; set; }
        public string? ThinkingLevel { get; set; }
    }
}
