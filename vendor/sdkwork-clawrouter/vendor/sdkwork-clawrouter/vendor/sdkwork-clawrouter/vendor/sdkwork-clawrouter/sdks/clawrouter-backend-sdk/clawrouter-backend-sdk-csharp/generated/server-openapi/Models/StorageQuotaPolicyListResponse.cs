using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageQuotaPolicyListResponse
    {
        public List<StorageQuotaPolicy> Items { get; set; }
        public string RequestId { get; set; }
    }
}
