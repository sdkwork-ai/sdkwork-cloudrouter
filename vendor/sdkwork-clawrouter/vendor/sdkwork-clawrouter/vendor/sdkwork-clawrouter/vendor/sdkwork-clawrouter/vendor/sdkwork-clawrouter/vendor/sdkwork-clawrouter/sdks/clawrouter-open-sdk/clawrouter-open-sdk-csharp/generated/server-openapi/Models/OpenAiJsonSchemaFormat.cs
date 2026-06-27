using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiJsonSchemaFormat
    {
        public string? Description { get; set; }
        public string? Name { get; set; }
        public OpenAiJsonSchema? Schema { get; set; }
        public bool? Strict { get; set; }
    }
}
