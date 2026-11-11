using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class VolcengineContentPart
    {
        public ArkAudioSource? AudioUrl { get; set; }
        public ArkDraftTask? DraftTask { get; set; }
        public ArkImageSource? ImageUrl { get; set; }
        public string? Role { get; set; }
        public string? Text { get; set; }
        public string Type { get; set; }
        public ArkVideoSource? VideoUrl { get; set; }
    }
}
