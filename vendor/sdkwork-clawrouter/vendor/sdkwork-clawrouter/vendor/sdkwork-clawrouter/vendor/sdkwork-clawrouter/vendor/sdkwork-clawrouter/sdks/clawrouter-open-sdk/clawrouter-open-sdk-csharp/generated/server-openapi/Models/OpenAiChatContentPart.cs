using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiChatContentPart
    {
        public OpenAiChatFile? File { get; set; }
        public OpenAiChatImageUrl? ImageUrl { get; set; }
        public OpenAiChatInputAudio? InputAudio { get; set; }
        public string? Text { get; set; }
        public string? Type { get; set; }
    }
}
