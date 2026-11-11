using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ViduAudioGenerationTask
    {
        public string? CreatedAt { get; set; }
        public List<ViduCreation>? Creations { get; set; }
        public int? Credits { get; set; }
        public int? Duration { get; set; }
        public string? ErrCode { get; set; }
        public string? Model { get; set; }
        public string? Prompt { get; set; }
        public int? Seed { get; set; }
        public string? State { get; set; }
        public string? TaskId { get; set; }
    }
}
