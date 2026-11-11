using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AnthropicOutputFormat
    {
        public ProviderJsonSchema Schema { get; set; }
        public string Type { get; set; }
    }
}
