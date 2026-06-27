using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class MediaResource
    {
        public MediaAccess? Access { get; set; }
        public MediaAiProvenance? Ai { get; set; }
        public string? AltText { get; set; }
        public string? BucketId { get; set; }
        public MediaChecksum? Checksum { get; set; }
        public double? DurationSeconds { get; set; }
        public string? FileName { get; set; }
        public int? Height { get; set; }
        public string? Id { get; set; }
        public string Kind { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? MimeType { get; set; }
        public string? ObjectBlobId { get; set; }
        public string? ObjectKey { get; set; }
        public string? ObjectVersion { get; set; }
        public MediaResource? Poster { get; set; }
        public string? PublicUrl { get; set; }
        public string? SizeBytes { get; set; }
        public string Source { get; set; }
        public List<MediaResource>? Thumbnails { get; set; }
        public string? Title { get; set; }
        public string? Uri { get; set; }
        public string? Url { get; set; }
        public List<MediaResource>? Variants { get; set; }
        public int? Width { get; set; }
    }
}
