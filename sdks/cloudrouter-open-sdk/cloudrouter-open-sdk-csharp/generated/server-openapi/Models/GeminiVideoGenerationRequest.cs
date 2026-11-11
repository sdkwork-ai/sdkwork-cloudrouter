using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class GeminiVideoGenerationRequest
    {
        public List<Dictionary<string, string>> Instances { get; set; }
        public Dictionary<string, string>? Parameters { get; set; }
    }
}
