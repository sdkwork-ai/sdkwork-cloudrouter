using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class SunoMusicGenerationRequest
    {
        public string? CallbackUrl { get; set; }
        public double? Duration { get; set; }
        public string? Model { get; set; }
        public string? NegativeTags { get; set; }
        public string? Prompt { get; set; }
        public string? Tags { get; set; }
        public string? Title { get; set; }
    }
}
