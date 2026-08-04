using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiConversationUpdateRequest
    {
        public Dictionary<string, string>? Metadata { get; set; }
    }
}
