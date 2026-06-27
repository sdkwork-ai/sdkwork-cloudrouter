using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class CreateStorageQuotaPolicyRequest
    {
        public string? Enforcement { get; set; }
        public string? QuotaLimit { get; set; }
        public string QuotaLimitBytes { get; set; }
        public string ScopeId { get; set; }
        public string ScopeType { get; set; }
        public string? SingleFileLimitBytes { get; set; }
    }
}
