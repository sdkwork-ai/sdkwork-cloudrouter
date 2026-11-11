using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiVideoExtendRequest
    {
        public string Prompt { get; set; }
        public string Seconds { get; set; }
        public string Video { get; set; }
    }
}
