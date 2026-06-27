using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class CacheNamespacesRefreshCreateResult
    {
        public string Code { get; set; }
        public AdminCacheOperationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
