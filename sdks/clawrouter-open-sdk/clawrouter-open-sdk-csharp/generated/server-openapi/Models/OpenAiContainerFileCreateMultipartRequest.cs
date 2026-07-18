using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiContainerFileCreateMultipartRequest
    {
        public string File { get; set; }
        public string? Metadata { get; set; }
        public string? Purpose { get; set; }
    }
}
