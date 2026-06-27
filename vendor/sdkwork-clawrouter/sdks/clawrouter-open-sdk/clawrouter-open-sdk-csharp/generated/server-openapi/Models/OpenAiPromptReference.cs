using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiPromptReference
    {
        public string? Id { get; set; }
        public Dictionary<string, string>? Variables { get; set; }
        public string? Version { get; set; }
    }
}
