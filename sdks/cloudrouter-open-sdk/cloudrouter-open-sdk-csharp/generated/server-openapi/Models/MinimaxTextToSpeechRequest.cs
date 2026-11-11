using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MinimaxTextToSpeechRequest
    {
        public Dictionary<string, string>? AudioSetting { get; set; }
        public string? LanguageBoost { get; set; }
        public string Model { get; set; }
        public string? OutputFormat { get; set; }
        public Dictionary<string, string>? PronunciationDict { get; set; }
        public bool? Stream { get; set; }
        public MinimaxStreamOptions? StreamOptions { get; set; }
        public bool? SubtitleEnable { get; set; }
        public string? SubtitleType { get; set; }
        public string Text { get; set; }
        public string? TextNormalizationMode { get; set; }
        public List<MinimaxTimbreWeight>? TimbreWeights { get; set; }
        public MinimaxVoiceModify? VoiceModify { get; set; }
        public Dictionary<string, string>? VoiceSetting { get; set; }
    }
}
