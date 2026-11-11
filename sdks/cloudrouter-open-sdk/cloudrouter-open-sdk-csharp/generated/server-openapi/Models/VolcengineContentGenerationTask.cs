using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class VolcengineContentGenerationTask
    {
        public ArkVideoTaskContent? Content { get; set; }
        public int? CreatedAt { get; set; }
        public bool? Draft { get; set; }
        public int? Duration { get; set; }
        public ProviderTaskError? Error { get; set; }
        public int? ExecutionExpiresAfter { get; set; }
        public int? Frames { get; set; }
        public int? Framespersecond { get; set; }
        public bool? GenerateAudio { get; set; }
        public string? Id { get; set; }
        public string? Model { get; set; }
        public string? OutputFormat { get; set; }
        public int? Priority { get; set; }
        public string? Ratio { get; set; }
        public string? Resolution { get; set; }
        public string? SafetyIdentifier { get; set; }
        public int? Seed { get; set; }
        public string? ServiceTier { get; set; }
        public string? Status { get; set; }
        public List<ArkWebSearchTool>? Tools { get; set; }
        public int? UpdatedAt { get; set; }
        public ArkVideoUsage? Usage { get; set; }
    }
}
