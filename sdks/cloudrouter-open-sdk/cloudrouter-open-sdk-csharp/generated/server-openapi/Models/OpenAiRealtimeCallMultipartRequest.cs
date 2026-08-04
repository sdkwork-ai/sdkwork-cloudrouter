using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiRealtimeCallMultipartRequest
    {
        public string Sdp { get; set; }
        public string? Session { get; set; }
    }
}
