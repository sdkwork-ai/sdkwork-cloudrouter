using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiError
    {
        public string? Code { get; set; }
        public string? Message { get; set; }
        public string? Param { get; set; }
        public string? Path { get; set; }
        public string? Type { get; set; }
    }
}
