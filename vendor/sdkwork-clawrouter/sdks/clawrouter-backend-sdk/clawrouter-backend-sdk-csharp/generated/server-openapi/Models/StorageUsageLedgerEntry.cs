using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageUsageLedgerEntry
    {
        public string? DeltaBytes { get; set; }
        public string Id { get; set; }
        public string? OccurredAt { get; set; }
        public string? ScopeId { get; set; }
        public string? ScopeType { get; set; }
    }
}
