using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiCertificateUploadMultipartRequest
    {
        public string? Certificate { get; set; }
        public string? File { get; set; }
        public string? Metadata { get; set; }
        public string? Name { get; set; }
    }
}
