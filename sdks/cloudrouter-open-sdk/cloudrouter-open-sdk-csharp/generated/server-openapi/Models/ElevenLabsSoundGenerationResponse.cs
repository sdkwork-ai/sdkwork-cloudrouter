using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ElevenLabsSoundGenerationResponse
    {
        public Dictionary<string, object>? Audio { get; set; }
        public string? AudioUrl { get; set; }
        public string? Id { get; set; }
        public string? Status { get; set; }
        public string? Url { get; set; }
    }
}
