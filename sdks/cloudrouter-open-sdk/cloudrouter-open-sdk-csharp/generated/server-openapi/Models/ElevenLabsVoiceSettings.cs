using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ElevenLabsVoiceSettings
    {
        public double? CloneStrength { get; set; }
        public double? SimilarityBoost { get; set; }
        public double? Speed { get; set; }
        public double? Stability { get; set; }
        public double? Style { get; set; }
        public bool? UseSpeakerBoost { get; set; }
    }
}
