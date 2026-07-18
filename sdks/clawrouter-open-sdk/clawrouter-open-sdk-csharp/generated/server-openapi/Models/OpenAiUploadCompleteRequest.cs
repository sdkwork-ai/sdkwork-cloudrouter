using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiUploadCompleteRequest
    {
        public string? Md5 { get; set; }
        public List<string> PartIds { get; set; }
    }
}
