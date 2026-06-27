using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class CacheOverviewRetrieveResult
    {
        public string Code { get; set; }
        public AdminCacheOverviewResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
