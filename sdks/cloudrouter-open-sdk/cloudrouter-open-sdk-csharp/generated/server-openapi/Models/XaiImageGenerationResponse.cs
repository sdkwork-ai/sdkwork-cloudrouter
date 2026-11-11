using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class XaiImageGenerationResponse
    {
        public List<XaiGeneratedImage> Data { get; set; }
        public XaiUsage? Usage { get; set; }
    }
}
