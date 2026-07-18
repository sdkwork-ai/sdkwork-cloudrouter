using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiConversationContentPart
    {
        public string? FileId { get; set; }
        public string? ImageUrl { get; set; }
        public string? Text { get; set; }
        public string Type { get; set; }
    }
}
