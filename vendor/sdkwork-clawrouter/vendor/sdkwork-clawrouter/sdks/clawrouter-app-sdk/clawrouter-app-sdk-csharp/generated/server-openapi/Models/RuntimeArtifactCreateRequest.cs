using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RuntimeArtifactCreateRequest
    {
        public string ArtifactType { get; set; }
        public Dictionary<string, string>? ContentJson { get; set; }
        public string? ContentText { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? MimeType { get; set; }
        public string? Name { get; set; }
        public MediaResource? Resource { get; set; }
        public string? Sha256 { get; set; }
        public string? SizeBytes { get; set; }
        public string? StorageKey { get; set; }
    }
}
