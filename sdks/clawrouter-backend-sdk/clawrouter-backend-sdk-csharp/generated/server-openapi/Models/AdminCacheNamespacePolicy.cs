using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminCacheNamespacePolicy
    {
        public string Consistency { get; set; }
        public bool Enabled { get; set; }
        public string FailureMode { get; set; }
        public string InstanceName { get; set; }
        public string JitterPercent { get; set; }
        public string Namespace { get; set; }
        public string Scope { get; set; }
        public string Sensitivity { get; set; }
        public string StaleWhileRevalidateSeconds { get; set; }
        public List<string> Tags { get; set; }
        public string TtlSeconds { get; set; }
    }
}
