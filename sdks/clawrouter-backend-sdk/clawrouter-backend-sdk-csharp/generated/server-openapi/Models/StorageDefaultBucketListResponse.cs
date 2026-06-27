using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageDefaultBucketListResponse
    {
        public List<StorageDefaultBucketConfig> Items { get; set; }
        public string RequestId { get; set; }
    }
}
