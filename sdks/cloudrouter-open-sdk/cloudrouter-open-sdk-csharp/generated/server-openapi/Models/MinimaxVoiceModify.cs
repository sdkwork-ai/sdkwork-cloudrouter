using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MinimaxVoiceModify
    {
        public int? Intensity { get; set; }
        public int? Pitch { get; set; }
        public string? SoundEffects { get; set; }
        public int? Timbre { get; set; }
    }
}
