using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageProviderHealthCheckResponse
    {
        public string? CheckedAt { get; set; }
        public bool Healthy { get; set; }
        public string ProviderId { get; set; }
        public string RequestId { get; set; }
        public string Status { get; set; }
    }
}
