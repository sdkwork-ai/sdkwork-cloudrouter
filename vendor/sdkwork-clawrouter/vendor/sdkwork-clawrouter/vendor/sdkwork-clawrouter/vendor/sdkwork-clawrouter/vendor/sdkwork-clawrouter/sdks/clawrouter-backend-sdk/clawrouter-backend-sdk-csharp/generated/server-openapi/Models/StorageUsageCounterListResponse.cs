using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageUsageCounterListResponse
    {
        public List<StorageUsageCounter> Items { get; set; }
        public string? NextCursor { get; set; }
        public string RequestId { get; set; }
    }
}
