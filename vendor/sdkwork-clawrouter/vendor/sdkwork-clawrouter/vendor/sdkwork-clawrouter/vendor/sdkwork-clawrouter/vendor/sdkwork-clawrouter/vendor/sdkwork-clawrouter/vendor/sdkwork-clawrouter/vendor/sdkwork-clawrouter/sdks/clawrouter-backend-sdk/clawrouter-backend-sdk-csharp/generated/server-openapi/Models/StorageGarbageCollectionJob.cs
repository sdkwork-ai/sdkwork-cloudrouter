using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageGarbageCollectionJob
    {
        public string? CandidateCount { get; set; }
        public string? CreatedAt { get; set; }
        public bool? DryRun { get; set; }
        public string Id { get; set; }
        public string JobId { get; set; }
        public string? JobType { get; set; }
        public string? Retention { get; set; }
        public string Status { get; set; }
        public string? Target { get; set; }
    }
}
