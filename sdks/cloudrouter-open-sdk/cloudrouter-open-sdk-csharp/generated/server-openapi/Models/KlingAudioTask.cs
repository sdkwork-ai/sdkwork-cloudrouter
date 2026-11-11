using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class KlingAudioTask
    {
        public int? Code { get; set; }
        public Dictionary<string, string>? Data { get; set; }
        public string? Message { get; set; }
        public string? RequestId { get; set; }
    }
}
