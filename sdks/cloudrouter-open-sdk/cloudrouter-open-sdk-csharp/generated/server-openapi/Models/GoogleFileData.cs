using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class GoogleFileData
    {
        public string? FileUri { get; set; }
        public string? MimeType { get; set; }
    }
}
