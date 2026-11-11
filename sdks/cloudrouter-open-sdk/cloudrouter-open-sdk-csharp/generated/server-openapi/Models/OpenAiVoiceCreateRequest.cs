using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiVoiceCreateRequest
    {
        public string? Model { get; set; }
        public string Name { get; set; }
        public string Prompt { get; set; }
        public string? ScriptHint { get; set; }
        public string Type { get; set; }
    }
}
