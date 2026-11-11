using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ElevenLabsTextToSpeechRequest
    {
        public bool? ApplyLanguageTextNormalization { get; set; }
        public string? ApplyTextNormalization { get; set; }
        public ElevenLabsAudioEffects? AudioEffects { get; set; }
        public string? LanguageCode { get; set; }
        public string? ModelId { get; set; }
        public List<string>? NextRequestIds { get; set; }
        public string? NextText { get; set; }
        public List<string>? PreviousRequestIds { get; set; }
        public string? PreviousText { get; set; }
        public List<ElevenLabsPronunciationDictionaryLocator>? PronunciationDictionaryLocators { get; set; }
        public int? Seed { get; set; }
        public string Text { get; set; }
        public bool? UsePvcAsIvc { get; set; }
        public ElevenLabsVoiceSettings? VoiceSettings { get; set; }
    }
}
