using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class KlingImageGenerationTask
    {
        public int? Code { get; set; }
        public KlingImageTaskData? Data { get; set; }
        public string? Message { get; set; }
        public string? RequestId { get; set; }
    }
}
