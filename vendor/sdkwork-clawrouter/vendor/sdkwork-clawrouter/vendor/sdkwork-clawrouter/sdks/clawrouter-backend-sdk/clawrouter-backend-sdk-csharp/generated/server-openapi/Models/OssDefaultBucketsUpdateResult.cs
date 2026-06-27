using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class OssDefaultBucketsUpdateResult
    {
        public string Code { get; set; }
        public StorageDefaultBucketMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
