using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ViduTemplateRequest
    {
        public string Template { get; set; }
        public List<string> Images { get; set; }
        public List<string> VideoUrls { get; set; }
        public string? Payload { get; set; }
        public string? CallbackUrl { get; set; }
    }
}
