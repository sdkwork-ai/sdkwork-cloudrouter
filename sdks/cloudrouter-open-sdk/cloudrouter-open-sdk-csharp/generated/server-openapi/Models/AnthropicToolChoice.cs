using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AnthropicToolChoice
    {
        public bool? DisableParallelToolUse { get; set; }
        public string? Name { get; set; }
        public string Type { get; set; }
    }
}
