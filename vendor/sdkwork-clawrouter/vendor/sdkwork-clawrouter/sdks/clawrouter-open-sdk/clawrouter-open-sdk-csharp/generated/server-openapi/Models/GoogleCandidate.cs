using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleCandidate
    {
        public GoogleCitationMetadata? CitationMetadata { get; set; }
        public GoogleContent? Content { get; set; }
        public string? FinishReason { get; set; }
        public int? Index { get; set; }
        public List<GoogleSafetyRating>? SafetyRatings { get; set; }
        public int? TokenCount { get; set; }
    }
}
