using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiRunCreateRequest
    {
        public string? AdditionalInstructions { get; set; }
        public string? AssistantId { get; set; }
        public string? Instructions { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public bool? Stream { get; set; }
        public List<string>? Tools { get; set; }
    }
}
