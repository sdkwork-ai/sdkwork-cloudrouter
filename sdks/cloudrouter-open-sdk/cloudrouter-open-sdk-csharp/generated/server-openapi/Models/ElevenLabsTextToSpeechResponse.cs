using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ElevenLabsTextToSpeechResponse
    {
        public string? AudioUrl { get; set; }
        public string? Id { get; set; }
        public string? Status { get; set; }
        public string? Url { get; set; }
    }
}
