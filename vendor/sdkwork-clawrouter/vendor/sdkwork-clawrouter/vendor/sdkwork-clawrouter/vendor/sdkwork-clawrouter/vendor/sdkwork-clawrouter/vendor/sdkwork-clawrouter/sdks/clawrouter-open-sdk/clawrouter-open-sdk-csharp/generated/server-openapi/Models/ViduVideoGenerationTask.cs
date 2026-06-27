using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class ViduVideoGenerationTask
    {
        public string? CreatedAt { get; set; }
        public List<ViduCreation>? Creations { get; set; }
        public string? Model { get; set; }
        public string? State { get; set; }
        public string? TaskId { get; set; }
    }
}
