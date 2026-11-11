using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class KlingVideoToAudioRequest
    {
        public bool? AsmrMode { get; set; }
        public string? BgmPrompt { get; set; }
        public string? CallbackUrl { get; set; }
        public string? ExternalTaskId { get; set; }
        public string? SoundEffectPrompt { get; set; }
        public string? VideoId { get; set; }
        public string? VideoUrl { get; set; }
    }
}
