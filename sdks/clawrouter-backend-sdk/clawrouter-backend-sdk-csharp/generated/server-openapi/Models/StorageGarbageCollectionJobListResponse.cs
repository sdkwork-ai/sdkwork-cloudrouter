using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageGarbageCollectionJobListResponse
    {
        public List<StorageGarbageCollectionJob> Items { get; set; }
        public string? NextCursor { get; set; }
        public string RequestId { get; set; }
    }
}
