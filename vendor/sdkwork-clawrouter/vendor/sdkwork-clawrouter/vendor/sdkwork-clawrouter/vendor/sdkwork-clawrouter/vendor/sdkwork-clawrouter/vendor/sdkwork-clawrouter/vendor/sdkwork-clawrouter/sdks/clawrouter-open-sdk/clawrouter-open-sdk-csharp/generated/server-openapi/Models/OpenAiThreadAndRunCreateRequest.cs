using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiThreadAndRunCreateRequest
    {
        public string? AssistantId { get; set; }
        public string? Instructions { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public bool? Stream { get; set; }
        public OpenAiThreadCreateRequest? Thread { get; set; }
        public List<string>? Tools { get; set; }
    }
}
