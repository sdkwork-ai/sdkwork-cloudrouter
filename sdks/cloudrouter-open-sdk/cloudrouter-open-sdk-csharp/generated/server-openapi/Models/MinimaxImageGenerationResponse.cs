using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MinimaxImageGenerationResponse
    {
        public MinimaxBaseResp? BaseResp { get; set; }
        public MinimaxImageData? Data { get; set; }
        public string? Id { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
    }
}
