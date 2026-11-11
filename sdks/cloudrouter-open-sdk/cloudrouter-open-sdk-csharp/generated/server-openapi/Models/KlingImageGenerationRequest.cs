using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class KlingImageGenerationRequest
    {
        public string? AspectRatio { get; set; }
        public string? CallbackUrl { get; set; }
        public List<KlingElementReference>? ElementList { get; set; }
        public string? ExternalTaskId { get; set; }
        public double? HumanFidelity { get; set; }
        public string? Image { get; set; }
        public double? ImageFidelity { get; set; }
        public string? ImageReference { get; set; }
        public string? ModelName { get; set; }
        public int? N { get; set; }
        public string? NegativePrompt { get; set; }
        public string Prompt { get; set; }
        public string? Resolution { get; set; }
        public KlingWatermarkInfo? WatermarkInfo { get; set; }
    }
}
