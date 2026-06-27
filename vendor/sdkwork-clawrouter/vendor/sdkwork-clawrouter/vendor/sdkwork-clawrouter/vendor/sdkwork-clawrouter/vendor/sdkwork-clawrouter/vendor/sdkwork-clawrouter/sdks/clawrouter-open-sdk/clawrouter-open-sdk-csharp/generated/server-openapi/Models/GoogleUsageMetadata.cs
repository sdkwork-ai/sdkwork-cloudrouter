using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleUsageMetadata
    {
        public int? CachedContentTokenCount { get; set; }
        public int? CandidatesTokenCount { get; set; }
        public int? PromptTokenCount { get; set; }
        public int? ThoughtsTokenCount { get; set; }
        public int? TotalTokenCount { get; set; }
    }
}
