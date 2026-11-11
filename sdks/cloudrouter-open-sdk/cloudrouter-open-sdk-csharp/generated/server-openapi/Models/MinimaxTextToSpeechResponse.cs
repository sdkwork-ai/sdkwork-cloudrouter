using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MinimaxTextToSpeechResponse
    {
        public MinimaxBaseResp? BaseResp { get; set; }
        public Dictionary<string, string>? Data { get; set; }
        public Dictionary<string, string>? ExtraInfo { get; set; }
        public string? TraceId { get; set; }
    }
}
