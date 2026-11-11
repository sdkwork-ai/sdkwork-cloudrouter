using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AlibabaSpeechRequest
    {
        public AlibabaSpeechInput Input { get; set; }
        public string Model { get; set; }
        public Dictionary<string, string>? Parameters { get; set; }
    }
}
