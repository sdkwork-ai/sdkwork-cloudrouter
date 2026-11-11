using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MiniMaxMusicGenerationRequest
    {
        public string? AudioBase64 { get; set; }
        public MiniMaxMusicAudioSetting? AudioSetting { get; set; }
        public string? AudioUrl { get; set; }
        public string? CoverFeatureId { get; set; }
        public bool? IsInstrumental { get; set; }
        public string? Lyrics { get; set; }
        public bool? LyricsOptimizer { get; set; }
        public string Model { get; set; }
        public string? OutputFormat { get; set; }
        public string? Prompt { get; set; }
        public bool? Stream { get; set; }
    }
}
