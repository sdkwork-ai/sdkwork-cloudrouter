using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiChatMessage
    {
        public string? Content { get; set; }
        public OpenAiFunctionCall? FunctionCall { get; set; }
        public string? Name { get; set; }
        public string? Refusal { get; set; }
        public string Role { get; set; }
        public string? ToolCallId { get; set; }
        public List<OpenAiToolCall>? ToolCalls { get; set; }
    }
}
