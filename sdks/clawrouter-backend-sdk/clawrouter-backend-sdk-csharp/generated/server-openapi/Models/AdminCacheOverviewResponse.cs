using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminCacheOverviewResponse
    {
        public List<AdminCacheInstance> Instances { get; set; }
        public List<AdminCacheNamespacePolicy> NamespacePolicies { get; set; }
        public AdminCacheSummary Summary { get; set; }
    }
}
