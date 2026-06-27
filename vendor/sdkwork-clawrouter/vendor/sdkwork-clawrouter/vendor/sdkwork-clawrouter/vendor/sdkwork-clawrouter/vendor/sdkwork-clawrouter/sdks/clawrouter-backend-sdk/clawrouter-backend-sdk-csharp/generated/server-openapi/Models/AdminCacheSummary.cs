using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminCacheSummary
    {
        public string CacheDeletes { get; set; }
        public string CacheErrors { get; set; }
        public string CacheHits { get; set; }
        public string CacheInspections { get; set; }
        public string CacheMisses { get; set; }
        public string CacheRefreshes { get; set; }
        public string CacheWrites { get; set; }
        public string ExpiredEntries { get; set; }
        public string RuntimeTarget { get; set; }
        public string TotalEntries { get; set; }
        public string TotalInstances { get; set; }
        public string TotalNamespaces { get; set; }
    }
}
