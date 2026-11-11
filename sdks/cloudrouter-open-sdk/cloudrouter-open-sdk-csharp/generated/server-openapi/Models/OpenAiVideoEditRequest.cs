using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiVideoEditRequest
    {
        public string Prompt { get; set; }
        public string Video { get; set; }
    }
}
