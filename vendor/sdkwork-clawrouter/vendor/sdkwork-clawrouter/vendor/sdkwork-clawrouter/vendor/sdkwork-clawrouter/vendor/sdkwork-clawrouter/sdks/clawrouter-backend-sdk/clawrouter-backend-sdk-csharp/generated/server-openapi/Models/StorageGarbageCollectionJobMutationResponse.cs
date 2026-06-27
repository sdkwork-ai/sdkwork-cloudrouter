using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageGarbageCollectionJobMutationResponse
    {
        public StorageGarbageCollectionJob Job { get; set; }
        public string RequestId { get; set; }
    }
}
