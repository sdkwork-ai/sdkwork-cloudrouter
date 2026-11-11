using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AlibabaVideoGenerationRequest
    {
        public Dictionary<string, string> Input { get; set; }
        public string Model { get; set; }
        public Dictionary<string, string>? Parameters { get; set; }
    }
}
