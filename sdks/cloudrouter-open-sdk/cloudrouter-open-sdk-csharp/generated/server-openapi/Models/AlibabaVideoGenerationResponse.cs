using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AlibabaVideoGenerationResponse
    {
        public string? Code { get; set; }
        public string? Message { get; set; }
        public AlibabaAsyncTask? Output { get; set; }
        public string? RequestId { get; set; }
        public AlibabaTaskUsage? Usage { get; set; }
    }
}
