using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiAudioTranslation
    {
        public double? Duration { get; set; }
        public List<string>? Segments { get; set; }
        public string? Text { get; set; }
    }
}
