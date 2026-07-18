using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class AnthropicTool
    {
        public string? Description { get; set; }
        public ProviderJsonSchema InputSchema { get; set; }
        public string Name { get; set; }
    }
}
