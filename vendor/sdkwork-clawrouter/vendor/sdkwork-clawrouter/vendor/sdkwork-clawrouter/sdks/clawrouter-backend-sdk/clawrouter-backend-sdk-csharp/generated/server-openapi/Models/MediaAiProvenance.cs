using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MediaAiProvenance
    {
        public string? GenerationTaskId { get; set; }
        public string? Model { get; set; }
        public string? ModerationStatus { get; set; }
        public string? PromptId { get; set; }
        public string? Provenance { get; set; }
        public string? Provider { get; set; }
        public List<string>? SafetyLabels { get; set; }
        public string? Seed { get; set; }
        public List<string>? SourceMediaIds { get; set; }
    }
}
