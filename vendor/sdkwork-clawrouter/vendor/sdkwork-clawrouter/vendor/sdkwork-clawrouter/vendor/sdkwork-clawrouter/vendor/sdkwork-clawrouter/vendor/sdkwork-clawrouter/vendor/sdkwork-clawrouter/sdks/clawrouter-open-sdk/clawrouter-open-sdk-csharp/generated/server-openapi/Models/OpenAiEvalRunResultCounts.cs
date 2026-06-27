using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiEvalRunResultCounts
    {
        public int? Errored { get; set; }
        public int? Failed { get; set; }
        public int? Passed { get; set; }
        public int? Total { get; set; }
    }
}
