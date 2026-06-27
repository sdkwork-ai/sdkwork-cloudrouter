using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageDefaultBucketMutationResponse
    {
        public StorageDefaultBucketConfig DefaultBucket { get; set; }
        public string RequestId { get; set; }
    }
}
