using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class OssBucketsCreateResult
    {
        public string Code { get; set; }
        public StorageBucketMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
