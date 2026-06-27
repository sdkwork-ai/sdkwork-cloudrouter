using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiResponseInputTokenCountRequest
    {
        public string? Input { get; set; }
        public string? Instructions { get; set; }
        public string? Model { get; set; }
        public List<string>? Tools { get; set; }
    }
}
