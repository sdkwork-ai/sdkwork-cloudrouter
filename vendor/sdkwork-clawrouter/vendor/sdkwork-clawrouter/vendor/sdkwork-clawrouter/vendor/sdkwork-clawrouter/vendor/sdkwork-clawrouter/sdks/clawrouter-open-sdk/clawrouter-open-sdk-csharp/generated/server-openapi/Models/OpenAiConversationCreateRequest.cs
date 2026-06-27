using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiConversationCreateRequest
    {
        public List<OpenAiConversationItemCreateRequest>? Items { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
    }
}
