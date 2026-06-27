using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class CreateStorageGarbageCollectionJobRequest
    {
        public Dictionary<string, string>? Criteria { get; set; }
        public bool DryRun { get; set; }
        public string? DryRunSample { get; set; }
        public string JobType { get; set; }
        public string? RetentionWindow { get; set; }
        public string? Target { get; set; }
    }
}
