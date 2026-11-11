using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AlibabaAsyncTask
    {
        public string? Code { get; set; }
        public string? EndTime { get; set; }
        public string? Message { get; set; }
        public string? OrigPrompt { get; set; }
        public List<ProviderGeneratedMedia>? Results { get; set; }
        public string? ScheduledTime { get; set; }
        public string? SubmitTime { get; set; }
        public string? TaskId { get; set; }
        public string? TaskStatus { get; set; }
        public string? VideoUrl { get; set; }
    }
}
