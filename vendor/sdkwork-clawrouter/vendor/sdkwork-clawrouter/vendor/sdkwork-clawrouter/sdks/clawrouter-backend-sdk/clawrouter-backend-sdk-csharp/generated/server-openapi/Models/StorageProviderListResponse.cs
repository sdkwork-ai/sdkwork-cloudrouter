using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageProviderListResponse
    {
        public List<StorageProviderConfig> Items { get; set; }
        public string RequestId { get; set; }
    }
}
