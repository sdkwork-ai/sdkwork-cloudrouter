using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleThinkingConfig
    {
        public bool? IncludeThoughts { get; set; }
        public int? ThinkingBudget { get; set; }
    }
}
