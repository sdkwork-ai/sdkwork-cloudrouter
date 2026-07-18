using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiChatCompletionChoice
    {
        public string? FinishReason { get; set; }
        public int Index { get; set; }
        public OpenAiChoiceLogprobs? Logprobs { get; set; }
        public OpenAiChatMessage Message { get; set; }
    }
}
