using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class XaiUsage
    {
        public int? CompletionTokens { get; set; }
        public int CostInUsdTicks { get; set; }
        public int? NumSourcesUsed { get; set; }
        public int? PromptTokens { get; set; }
        public int? TotalTokens { get; set; }
    }
}
