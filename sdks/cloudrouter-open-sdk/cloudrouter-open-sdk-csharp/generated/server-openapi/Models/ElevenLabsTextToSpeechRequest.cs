using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ElevenLabsTextToSpeechRequest
    {
        public string ModelId { get; set; }
        public string Text { get; set; }
        public Dictionary<string, object>? VoiceSettings { get; set; }
    }
}
