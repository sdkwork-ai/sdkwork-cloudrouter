using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class GeminiImageGenerationResponse
    {
        public Dictionary<string, string>? Error { get; set; }
        public List<Dictionary<string, string>>? Predictions { get; set; }
    }
}
