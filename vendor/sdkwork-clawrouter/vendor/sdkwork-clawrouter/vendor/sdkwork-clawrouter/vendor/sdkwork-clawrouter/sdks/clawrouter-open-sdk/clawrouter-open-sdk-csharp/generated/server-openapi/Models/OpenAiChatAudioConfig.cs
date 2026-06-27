using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiChatAudioConfig
    {
        public string? Format { get; set; }
        public string? Voice { get; set; }
    }
}
