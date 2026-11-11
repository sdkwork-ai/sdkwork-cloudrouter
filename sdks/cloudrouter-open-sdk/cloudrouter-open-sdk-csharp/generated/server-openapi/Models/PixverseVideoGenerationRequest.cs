using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class PixverseVideoGenerationRequest
    {
        public string AspectRatio { get; set; }
        public int Duration { get; set; }
        public bool? GenerateAudioSwitch { get; set; }
        public bool? GenerateMultiClipSwitch { get; set; }
        public string Model { get; set; }
        public string Prompt { get; set; }
        public string Quality { get; set; }
        public int? Seed { get; set; }
        public string? WebhookId { get; set; }
    }
}
