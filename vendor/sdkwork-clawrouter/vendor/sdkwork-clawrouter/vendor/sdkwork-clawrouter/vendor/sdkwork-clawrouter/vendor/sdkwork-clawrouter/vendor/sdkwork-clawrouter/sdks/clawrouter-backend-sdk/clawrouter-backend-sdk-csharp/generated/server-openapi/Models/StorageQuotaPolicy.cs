using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageQuotaPolicy
    {
        public string? CreatedAt { get; set; }
        public string? Enforcement { get; set; }
        public string Id { get; set; }
        public string? Limit { get; set; }
        public string QuotaLimitBytes { get; set; }
        public string ScopeId { get; set; }
        public string ScopeType { get; set; }
        public string? SingleFileLimitBytes { get; set; }
        public string Status { get; set; }
        public string? UpdatedAt { get; set; }
        public string? Used { get; set; }
        public string UsedBytes { get; set; }
    }
}
