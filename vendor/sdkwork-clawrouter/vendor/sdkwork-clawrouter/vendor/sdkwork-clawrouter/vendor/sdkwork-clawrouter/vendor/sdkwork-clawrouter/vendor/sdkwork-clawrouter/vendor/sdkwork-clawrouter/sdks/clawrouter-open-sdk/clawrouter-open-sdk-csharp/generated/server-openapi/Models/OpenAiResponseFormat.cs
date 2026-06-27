using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiResponseFormat
    {
        public OpenAiJsonSchemaFormat? JsonSchema { get; set; }
        public string? Type { get; set; }
    }
}
