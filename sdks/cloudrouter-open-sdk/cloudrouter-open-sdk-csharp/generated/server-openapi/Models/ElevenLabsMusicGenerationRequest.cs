using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ElevenLabsMusicGenerationRequest
    {
        public ElevenLabsMusicPrompt? CompositionPlan { get; set; }
        public string? FinetuneId { get; set; }
        public double? FinetuneStrength { get; set; }
        public bool? ForceInstrumental { get; set; }
        public string? GenerationMode { get; set; }
        public string? LyricsText { get; set; }
        public string? ModelId { get; set; }
        public int? MusicLengthMs { get; set; }
        public ElevenLabsMusicPrompt? MusicPrompt { get; set; }
        public string? Prompt { get; set; }
        public bool? RespectSectionsDurations { get; set; }
        public int? Seed { get; set; }
        public bool? SignWithC2pa { get; set; }
        public bool? StoreForInpainting { get; set; }
        public bool? UsePhoneticNames { get; set; }
    }
}
