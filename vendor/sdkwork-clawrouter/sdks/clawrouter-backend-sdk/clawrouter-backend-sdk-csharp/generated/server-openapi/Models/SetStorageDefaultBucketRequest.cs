using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class SetStorageDefaultBucketRequest
    {
        public string BucketId { get; set; }
        public string Reason { get; set; }
    }
}
