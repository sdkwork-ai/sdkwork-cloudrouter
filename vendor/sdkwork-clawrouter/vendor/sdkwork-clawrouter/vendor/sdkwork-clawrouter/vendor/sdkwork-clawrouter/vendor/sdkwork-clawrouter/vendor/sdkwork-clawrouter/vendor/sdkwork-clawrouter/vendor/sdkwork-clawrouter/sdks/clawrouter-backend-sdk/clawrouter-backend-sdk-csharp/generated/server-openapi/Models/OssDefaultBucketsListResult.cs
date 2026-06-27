using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class OssDefaultBucketsListResult
    {
        public string Code { get; set; }
        public StorageDefaultBucketListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
