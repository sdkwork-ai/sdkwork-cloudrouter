using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiChoiceLogprobs
    {
        public List<OpenAiTokenLogprob>? Content { get; set; }
        public List<OpenAiTokenLogprob>? Refusal { get; set; }
    }
}
