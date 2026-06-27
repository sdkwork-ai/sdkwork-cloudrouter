using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiFineTuningGraderRunRequest
    {
        public string? Grader { get; set; }
        public string? Input { get; set; }
        public string? ModelSample { get; set; }
        public string? ReferenceAnswer { get; set; }
    }
}
