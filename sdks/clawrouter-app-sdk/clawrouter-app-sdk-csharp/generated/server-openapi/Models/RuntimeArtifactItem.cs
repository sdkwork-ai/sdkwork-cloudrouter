using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RuntimeArtifactItem
    {
        public string ArtifactType { get; set; }
        public string? ContentText { get; set; }
        public string CreatedAt { get; set; }
        public string Id { get; set; }
        public string InvocationId { get; set; }
        public string? MimeType { get; set; }
        public string? Name { get; set; }
        public MediaResource? Resource { get; set; }
        public string? Sha256 { get; set; }
        public string? SizeBytes { get; set; }
        public string? StorageKey { get; set; }
    }
}
