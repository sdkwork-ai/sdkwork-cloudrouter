using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageBucketMutationResponse
    {
        public StorageBucketConfig Bucket { get; set; }
        public string RequestId { get; set; }
    }
}
