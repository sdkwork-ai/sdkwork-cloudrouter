using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class XaiDeferredImageResponse
    {
        public List<XaiGeneratedImage>? Data { get; set; }
        public Dictionary<string, string>? Error { get; set; }
        public string RequestId { get; set; }
        public string Status { get; set; }
        public XaiUsage? Usage { get; set; }
    }
}
