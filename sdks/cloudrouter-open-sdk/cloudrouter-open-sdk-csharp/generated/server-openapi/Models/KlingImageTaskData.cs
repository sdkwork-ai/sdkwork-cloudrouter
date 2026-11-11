using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class KlingImageTaskData
    {
        public int? CreatedAt { get; set; }
        public string? TaskId { get; set; }
        public Dictionary<string, string>? TaskInfo { get; set; }
        public KlingImageTaskResult? TaskResult { get; set; }
        public string? TaskStatus { get; set; }
        public string? TaskStatusMsg { get; set; }
        public int? UpdatedAt { get; set; }
    }
}
