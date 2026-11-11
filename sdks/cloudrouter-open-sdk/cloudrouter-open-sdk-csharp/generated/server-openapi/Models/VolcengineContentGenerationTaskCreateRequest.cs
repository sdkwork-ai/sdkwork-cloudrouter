using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class VolcengineContentGenerationTaskCreateRequest
    {
        public string? CallbackUrl { get; set; }
        public bool? CameraFixed { get; set; }
        public List<VolcengineContentPart> Content { get; set; }
        public bool? Draft { get; set; }
        public int? Duration { get; set; }
        public int? ExecutionExpiresAfter { get; set; }
        public int? Frames { get; set; }
        public bool? GenerateAudio { get; set; }
        public string Model { get; set; }
        public string? OmniReferenceTaskType { get; set; }
        public string? OutputFormat { get; set; }
        public int? Priority { get; set; }
        public string? Ratio { get; set; }
        public string? Resolution { get; set; }
        public bool? ReturnLastFrame { get; set; }
        public string? SafetyIdentifier { get; set; }
        public int? Seed { get; set; }
        public string? ServiceTier { get; set; }
        public List<ArkWebSearchTool>? Tools { get; set; }
        public bool? Watermark { get; set; }
    }
}
