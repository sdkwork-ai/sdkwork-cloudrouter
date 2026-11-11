using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class GeminiVideoOperation
    {
        public bool? Done { get; set; }
        public Dictionary<string, string>? Error { get; set; }
        public string? Name { get; set; }
        public Dictionary<string, string>? Response { get; set; }
    }
}
