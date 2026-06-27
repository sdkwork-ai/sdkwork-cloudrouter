using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleFile
    {
        public string? CreateTime { get; set; }
        public string? DisplayName { get; set; }
        public ProviderTaskError? Error { get; set; }
        public string? ExpirationTime { get; set; }
        public string? MimeType { get; set; }
        public string? Name { get; set; }
        public string? Sha256Hash { get; set; }
        public string? SizeBytes { get; set; }
        public string? State { get; set; }
        public string? UpdateTime { get; set; }
        public string? Uri { get; set; }
    }
}
