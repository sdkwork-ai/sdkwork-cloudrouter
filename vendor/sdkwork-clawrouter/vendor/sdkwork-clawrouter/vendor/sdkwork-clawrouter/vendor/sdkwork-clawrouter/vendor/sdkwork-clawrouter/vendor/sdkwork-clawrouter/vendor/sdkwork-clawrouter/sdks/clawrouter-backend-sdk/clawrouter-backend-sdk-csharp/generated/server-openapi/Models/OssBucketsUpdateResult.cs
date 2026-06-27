using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class OssBucketsUpdateResult
    {
        public string Code { get; set; }
        public StorageBucketMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
