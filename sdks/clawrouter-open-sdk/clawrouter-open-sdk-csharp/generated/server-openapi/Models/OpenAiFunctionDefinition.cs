using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiFunctionDefinition
    {
        public string? Description { get; set; }
        public string? Name { get; set; }
        public OpenAiJsonSchema? Parameters { get; set; }
        public bool? Strict { get; set; }
    }
}
