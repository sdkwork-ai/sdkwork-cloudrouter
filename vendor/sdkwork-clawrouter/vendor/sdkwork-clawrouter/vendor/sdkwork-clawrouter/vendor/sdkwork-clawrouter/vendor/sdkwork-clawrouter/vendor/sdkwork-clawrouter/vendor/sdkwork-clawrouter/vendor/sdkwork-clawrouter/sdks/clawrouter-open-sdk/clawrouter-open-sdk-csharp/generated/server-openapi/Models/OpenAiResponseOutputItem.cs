using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiResponseOutputItem
    {
        public List<OpenAiResponseOutputContent>? Content { get; set; }
        public string? Id { get; set; }
        public string? Role { get; set; }
        public string? Status { get; set; }
        public string? Type { get; set; }
    }
}
