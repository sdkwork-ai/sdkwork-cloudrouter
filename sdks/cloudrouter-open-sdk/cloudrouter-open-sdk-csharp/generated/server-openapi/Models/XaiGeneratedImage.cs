using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class XaiGeneratedImage
    {
        public string? B64Json { get; set; }
        public Dictionary<string, string>? FileOutput { get; set; }
        public string? MimeType { get; set; }
        public string? StorageError { get; set; }
        public string? Url { get; set; }
    }
}
