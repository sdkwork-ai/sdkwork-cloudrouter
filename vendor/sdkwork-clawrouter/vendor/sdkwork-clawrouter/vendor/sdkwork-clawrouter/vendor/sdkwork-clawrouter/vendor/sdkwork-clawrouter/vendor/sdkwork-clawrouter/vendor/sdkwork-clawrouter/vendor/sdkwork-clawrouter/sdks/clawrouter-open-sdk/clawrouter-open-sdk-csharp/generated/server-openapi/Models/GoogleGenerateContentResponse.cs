using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleGenerateContentResponse
    {
        public List<GoogleCandidate>? Candidates { get; set; }
        public string? ModelVersion { get; set; }
        public GooglePromptFeedback? PromptFeedback { get; set; }
        public string? ResponseId { get; set; }
        public GoogleUsageMetadata? UsageMetadata { get; set; }
    }
}
