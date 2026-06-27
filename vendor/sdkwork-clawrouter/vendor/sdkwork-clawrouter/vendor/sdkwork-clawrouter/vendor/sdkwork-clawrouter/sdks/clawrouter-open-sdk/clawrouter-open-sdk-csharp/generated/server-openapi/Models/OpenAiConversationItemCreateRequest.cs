using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiConversationItemCreateRequest
    {
        public List<OpenAiConversationContentPart>? Content { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Role { get; set; }
        public string? Type { get; set; }
    }
}
