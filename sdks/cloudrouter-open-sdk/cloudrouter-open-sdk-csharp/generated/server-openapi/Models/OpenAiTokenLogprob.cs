using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiTokenLogprob
    {
        public List<int>? Bytes { get; set; }
        public double Logprob { get; set; }
        public string Token { get; set; }
        public List<OpenAiTopLogprob>? TopLogprobs { get; set; }
    }
}
