using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminModelCatalogSyncResponse
    {
        public string AcceptedCount { get; set; }
        public string CapabilityCount { get; set; }
        public string? CatalogRoot { get; set; }
        public string CatalogVersion { get; set; }
        public bool DryRun { get; set; }
        public string FamilyCount { get; set; }
        public string MeterCount { get; set; }
        public string Mode { get; set; }
        public string ModelCount { get; set; }
        public List<AdminAiModelItem> Models { get; set; }
        public string PriceCount { get; set; }
        public string RankingCount { get; set; }
        public string? RequestedCatalogVersion { get; set; }
        public string? SnapshotId { get; set; }
        public string Source { get; set; }
        public string SourceHash { get; set; }
        public string? SyncRunId { get; set; }
        public bool Synced { get; set; }
        public List<string> VendorCodes { get; set; }
        public string VendorCount { get; set; }
        public List<AdminModelVendorItem> Vendors { get; set; }
    }
}
