using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiConversationItemCreateRequest
    {
        public List<Dictionary<string, string>> Items { get; set; }
    }
}
