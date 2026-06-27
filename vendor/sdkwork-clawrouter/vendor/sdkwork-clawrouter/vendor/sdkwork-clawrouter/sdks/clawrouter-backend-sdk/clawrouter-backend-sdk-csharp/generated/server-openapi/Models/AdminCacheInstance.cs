using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminCacheInstance
    {
        public string CacheDeletes { get; set; }
        public string CacheErrors { get; set; }
        public string CacheHits { get; set; }
        public string CacheInspections { get; set; }
        public string CacheMisses { get; set; }
        public string CacheRefreshes { get; set; }
        public string CacheWrites { get; set; }
        public string? ConnectionProfileName { get; set; }
        public string DefaultTtlSeconds { get; set; }
        public string EntryCount { get; set; }
        public string ExpiredEntryCount { get; set; }
        public string KeyPrefix { get; set; }
        public string? MaxEntries { get; set; }
        public string Name { get; set; }
        public string ProviderKind { get; set; }
        public string Purpose { get; set; }
        public string Status { get; set; }
        public bool SupportsDelete { get; set; }
        public bool SupportsInspect { get; set; }
        public bool SupportsRefresh { get; set; }
    }
}
