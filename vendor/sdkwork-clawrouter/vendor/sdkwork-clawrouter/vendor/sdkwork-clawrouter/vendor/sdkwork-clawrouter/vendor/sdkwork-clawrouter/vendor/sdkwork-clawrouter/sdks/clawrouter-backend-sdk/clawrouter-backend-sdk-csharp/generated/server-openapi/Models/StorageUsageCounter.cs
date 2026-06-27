using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageUsageCounter
    {
        public string FileCount { get; set; }
        public string? Files { get; set; }
        public string Id { get; set; }
        public string? Reserved { get; set; }
        public string ReservedBytes { get; set; }
        public string? Scope { get; set; }
        public string ScopeId { get; set; }
        public string ScopeType { get; set; }
        public string? SnapshotAt { get; set; }
        public string? UpdatedAt { get; set; }
        public string? Used { get; set; }
        public string UsedBytes { get; set; }
    }
}
