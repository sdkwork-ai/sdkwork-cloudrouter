using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class BytedanceSpeechChunk
    {
        public int? Code { get; set; }
        public string? Data { get; set; }
        public string? Message { get; set; }
        public int? Sequence { get; set; }
    }
}
