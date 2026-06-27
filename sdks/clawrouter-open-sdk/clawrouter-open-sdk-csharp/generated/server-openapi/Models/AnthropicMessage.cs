using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class AnthropicMessage
    {
        public List<AnthropicContentBlock>? Content { get; set; }
        public string? Id { get; set; }
        public string? Model { get; set; }
        public string? Role { get; set; }
        public string? StopReason { get; set; }
        public string? StopSequence { get; set; }
        public string? Type { get; set; }
        public AnthropicUsage? Usage { get; set; }
    }
}
