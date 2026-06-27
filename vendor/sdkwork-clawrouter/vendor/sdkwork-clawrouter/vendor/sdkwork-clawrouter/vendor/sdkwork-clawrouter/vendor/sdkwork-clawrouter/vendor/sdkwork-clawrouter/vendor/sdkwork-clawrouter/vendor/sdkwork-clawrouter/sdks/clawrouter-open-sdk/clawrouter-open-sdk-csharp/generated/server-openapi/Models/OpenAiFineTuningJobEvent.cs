using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiFineTuningJobEvent
    {
        public int? CreatedAt { get; set; }
        public string? Data { get; set; }
        public string? Id { get; set; }
        public string? Level { get; set; }
        public string? Message { get; set; }
        public string? Object { get; set; }
        public string? Type { get; set; }
    }
}
