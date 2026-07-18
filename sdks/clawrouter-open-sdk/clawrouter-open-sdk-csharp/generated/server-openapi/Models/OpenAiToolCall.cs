using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiToolCall
    {
        public OpenAiFunctionCall? Function { get; set; }
        public string Id { get; set; }
        public string Type { get; set; }
    }
}
