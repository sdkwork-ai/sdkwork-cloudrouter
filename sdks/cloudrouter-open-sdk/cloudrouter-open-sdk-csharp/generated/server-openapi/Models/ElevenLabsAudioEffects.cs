using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ElevenLabsAudioEffects
    {
        public string? BackgroundNoiseId { get; set; }
        public double? Distance { get; set; }
        public string? EnvironmentId { get; set; }
        public string? FilterPresetId { get; set; }
        public double? Pan { get; set; }
        public double? SendLevel { get; set; }
    }
}
