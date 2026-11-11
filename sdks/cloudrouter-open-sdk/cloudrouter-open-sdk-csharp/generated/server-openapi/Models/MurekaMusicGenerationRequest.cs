using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MurekaMusicGenerationRequest
    {
        public string? CallbackUrl { get; set; }
        public int? Duration { get; set; }
        public string? Lyrics { get; set; }
        public string Model { get; set; }
        public string? Prompt { get; set; }
        public string? ReferenceAudioUrl { get; set; }
        public List<string>? Tags { get; set; }
        public string? Title { get; set; }
    }
}
