using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class CreateStorageReconciliationRunRequest
    {
        public string? BucketId { get; set; }
        public string? CheckMode { get; set; }
        public bool DryRun { get; set; }
        public string? ProviderId { get; set; }
        public string? Reason { get; set; }
        public string RunType { get; set; }
    }
}
