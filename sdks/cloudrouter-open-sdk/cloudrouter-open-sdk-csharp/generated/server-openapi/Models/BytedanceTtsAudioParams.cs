using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class BytedanceTtsAudioParams
    {
        public string Format { get; set; }
        public int? LoudnessRate { get; set; }
        public int SampleRate { get; set; }
        public int? SpeechRate { get; set; }
    }
}
