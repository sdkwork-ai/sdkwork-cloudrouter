using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiResponseOutputContent
    {
        public List<OpenAiAnnotation>? Annotations { get; set; }
        public string? Refusal { get; set; }
        public string? Text { get; set; }
        public string? Type { get; set; }
    }
}
