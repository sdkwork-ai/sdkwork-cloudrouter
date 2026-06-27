using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiVideoExtendRequest
    {
        public string? Image { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public string? Prompt { get; set; }
        public int? Seconds { get; set; }
        public string? Size { get; set; }
        public string? Video { get; set; }
    }
}
