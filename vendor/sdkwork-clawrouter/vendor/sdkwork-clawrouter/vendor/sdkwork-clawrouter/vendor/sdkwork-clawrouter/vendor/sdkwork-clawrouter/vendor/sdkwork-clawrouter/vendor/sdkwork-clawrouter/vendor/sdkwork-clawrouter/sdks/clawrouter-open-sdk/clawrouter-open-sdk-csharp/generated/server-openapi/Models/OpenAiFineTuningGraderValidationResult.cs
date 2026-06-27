using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiFineTuningGraderValidationResult
    {
        public List<string>? Errors { get; set; }
        public bool? Valid { get; set; }
        public List<string>? Warnings { get; set; }
    }
}
