using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class XaiImageGenerationRequest
    {
        public string? AspectRatio { get; set; }
        public bool? Deferred { get; set; }
        public string? Model { get; set; }
        public int? N { get; set; }
        public Dictionary<string, string>? Output { get; set; }
        public string Prompt { get; set; }
        public string? Resolution { get; set; }
        public string? ResponseFormat { get; set; }
        public Dictionary<string, string>? StorageOptions { get; set; }
        public string? User { get; set; }
    }
}
