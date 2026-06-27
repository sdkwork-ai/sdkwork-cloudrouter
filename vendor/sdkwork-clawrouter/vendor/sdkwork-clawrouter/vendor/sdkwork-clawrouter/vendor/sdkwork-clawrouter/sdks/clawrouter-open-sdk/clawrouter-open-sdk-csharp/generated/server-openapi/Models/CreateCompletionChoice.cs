using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class CreateCompletionChoice
    {
        public string? FinishReason { get; set; }
        public int? Index { get; set; }
        public CreateCompletionLogprobs? Logprobs { get; set; }
        public string? Text { get; set; }
    }
}
