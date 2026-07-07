using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class CacheOverview
    {
        public List<Dictionary<string, object>> Instances { get; set; }
        public List<Dictionary<string, object>> NamespacePolicies { get; set; }
        public Dictionary<string, object> Summary { get; set; }
    }
}
