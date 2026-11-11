using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiVideoCreateRequest
    {
        public Dictionary<string, string>? InputReference { get; set; }
        public string? Model { get; set; }
        public string Prompt { get; set; }
        public string? Seconds { get; set; }
        public string? Size { get; set; }
    }
}
