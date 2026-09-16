using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MiniMaxMusicGenerationResponse
    {
        public MiniMaxMusicBaseResp? BaseResp { get; set; }
        public MiniMaxMusicData? Data { get; set; }
        public string? TraceId { get; set; }
    }
}
