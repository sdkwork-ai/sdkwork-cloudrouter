using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class CacheNamespacesKeysListResult
    {
        public string Code { get; set; }
        public AdminCacheKeyListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
