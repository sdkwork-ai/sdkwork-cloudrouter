using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class CacheNamespaceKeyPage
    {
        public string InstanceName { get; set; }
        public List<Dictionary<string, object>> Items { get; set; }
        public string Namespace { get; set; }
        public PageInfo PageInfo { get; set; }
        public string ReturnedItems { get; set; }
        public bool ScanComplete { get; set; }
        public string ScannedItems { get; set; }
    }
}
