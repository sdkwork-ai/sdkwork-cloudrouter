using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleFileUploadMultipartRequest
    {
        public string File { get; set; }
        public string? Metadata { get; set; }
    }
}
