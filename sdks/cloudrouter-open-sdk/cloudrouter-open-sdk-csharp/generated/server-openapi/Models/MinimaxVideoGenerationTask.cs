using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MinimaxVideoGenerationTask
    {
        public MinimaxBaseResp? BaseResp { get; set; }
        public string? FileId { get; set; }
        public string? Status { get; set; }
        public string? TaskId { get; set; }
        public int? VideoHeight { get; set; }
        public int? VideoWidth { get; set; }
    }
}
