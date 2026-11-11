using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AlibabaSpeechResponse
    {
        public string? Code { get; set; }
        public string? Message { get; set; }
        public Dictionary<string, string>? Output { get; set; }
        public string? RequestId { get; set; }
        public Dictionary<string, string>? Usage { get; set; }
    }
}
