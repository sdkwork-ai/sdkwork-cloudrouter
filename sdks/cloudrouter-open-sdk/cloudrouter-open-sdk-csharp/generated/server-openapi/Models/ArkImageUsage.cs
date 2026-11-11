using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ArkImageUsage
    {
        public int? GeneratedImages { get; set; }
        public int? InputImages { get; set; }
        public int? OutputTokens { get; set; }
        public ArkVideoToolUsage? ToolUsage { get; set; }
        public int? TotalTokens { get; set; }
    }
}
