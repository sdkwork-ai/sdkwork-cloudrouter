using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class SunoMusicTrack
    {
        public string? AudioUrl { get; set; }
        public double? Duration { get; set; }
        public string? Id { get; set; }
        public string? ImageUrl { get; set; }
        public string? Lyrics { get; set; }
        public string? Title { get; set; }
        public string? VideoUrl { get; set; }
    }
}
