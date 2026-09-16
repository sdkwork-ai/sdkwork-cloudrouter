using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ElevenLabsSoundGenerationRequest
    {
        public double? DurationSeconds { get; set; }
        public bool? Loop { get; set; }
        public string ModelId { get; set; }
        public double? PromptInfluence { get; set; }
        public string Text { get; set; }
    }
}
