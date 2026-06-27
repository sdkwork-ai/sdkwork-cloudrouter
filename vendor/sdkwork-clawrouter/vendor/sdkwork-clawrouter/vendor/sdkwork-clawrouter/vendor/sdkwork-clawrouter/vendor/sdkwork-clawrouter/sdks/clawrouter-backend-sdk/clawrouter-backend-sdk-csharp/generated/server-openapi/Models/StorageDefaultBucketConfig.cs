using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageDefaultBucketConfig
    {
        public string BucketId { get; set; }
        public string BucketName { get; set; }
        public string? DataResidencyRegion { get; set; }
        public string Id { get; set; }
        public string LogicalScope { get; set; }
        public string ProviderCode { get; set; }
        public string ProviderId { get; set; }
        public string? ProviderType { get; set; }
        public string? Reason { get; set; }
        public string? Region { get; set; }
        public string Status { get; set; }
        public string? UpdatedAt { get; set; }
    }
}
