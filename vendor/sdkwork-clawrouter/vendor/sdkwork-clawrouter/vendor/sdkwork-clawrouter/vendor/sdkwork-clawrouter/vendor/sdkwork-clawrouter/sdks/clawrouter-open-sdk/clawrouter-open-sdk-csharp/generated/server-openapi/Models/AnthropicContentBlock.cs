using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class AnthropicContentBlock
    {
        public string? Id { get; set; }
        public Dictionary<string, string>? Input { get; set; }
        public string? Name { get; set; }
        public string? Text { get; set; }
        public string? Type { get; set; }
    }
}
