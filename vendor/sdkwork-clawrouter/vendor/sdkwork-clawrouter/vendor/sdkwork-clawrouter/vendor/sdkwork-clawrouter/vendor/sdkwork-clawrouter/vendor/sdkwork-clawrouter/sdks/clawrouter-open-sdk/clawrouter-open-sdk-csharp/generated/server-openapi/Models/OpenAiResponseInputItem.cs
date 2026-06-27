using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiResponseInputItem
    {
        public string? Content { get; set; }
        public string? Id { get; set; }
        public string? Role { get; set; }
        public string? Status { get; set; }
        public string? Type { get; set; }
    }
}
