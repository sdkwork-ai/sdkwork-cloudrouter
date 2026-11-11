using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ArkVideoUsage
    {
        public int? CompletionTokens { get; set; }
        public ArkVideoToolUsage? ToolUsage { get; set; }
        public int? TotalTokens { get; set; }
    }
}
