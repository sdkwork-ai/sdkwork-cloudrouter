using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiFileUploadRequest
    {
        public string File { get; set; }
        public string Purpose { get; set; }
    }
}
