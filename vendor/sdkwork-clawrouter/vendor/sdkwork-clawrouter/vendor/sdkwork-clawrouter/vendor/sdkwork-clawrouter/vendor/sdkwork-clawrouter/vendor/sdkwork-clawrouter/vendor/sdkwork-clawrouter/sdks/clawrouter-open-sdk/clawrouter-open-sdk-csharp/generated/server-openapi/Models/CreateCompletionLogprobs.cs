using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class CreateCompletionLogprobs
    {
        public List<int>? TextOffset { get; set; }
        public List<double>? TokenLogprobs { get; set; }
        public List<string>? Tokens { get; set; }
        public List<Dictionary<string, object>>? TopLogprobs { get; set; }
    }
}
