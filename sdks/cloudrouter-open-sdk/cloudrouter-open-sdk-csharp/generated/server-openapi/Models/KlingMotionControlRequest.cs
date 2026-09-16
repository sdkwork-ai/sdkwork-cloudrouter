using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class KlingMotionControlRequest
    {
        public string? CallbackUrl { get; set; }
        public string Image { get; set; }
        public string? ModelName { get; set; }
        public string? Prompt { get; set; }
        public string Video { get; set; }
    }
}
