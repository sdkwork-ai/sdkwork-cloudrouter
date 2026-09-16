using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MiniMaxMusicGenerationRequest
    {
        public string Model { get; set; }
        public string? Prompt { get; set; }
        public string? Lyrics { get; set; }
        public bool? Stream { get; set; }
        public string? OutputFormat { get; set; }
        public bool? IsInstrumental { get; set; }
        public bool? LyricsOptimizer { get; set; }
        public MiniMaxMusicAudioSetting? AudioSetting { get; set; }
    }
}
