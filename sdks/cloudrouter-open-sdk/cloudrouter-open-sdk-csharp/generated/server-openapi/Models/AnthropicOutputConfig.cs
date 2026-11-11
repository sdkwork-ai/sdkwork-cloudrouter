using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AnthropicOutputConfig
    {
        public string? Effort { get; set; }
        public AnthropicOutputFormat? Format { get; set; }
    }
}
