using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class SunoMusicGenerationTaskResponse
    {
        public string? CreatedAt { get; set; }
        public ProviderTaskError? Error { get; set; }
        public string? Id { get; set; }
        public string? Status { get; set; }
        public string? TaskId { get; set; }
        public string? Title { get; set; }
        public List<SunoMusicTrack>? Tracks { get; set; }
        public string? UpdatedAt { get; set; }
    }
}
