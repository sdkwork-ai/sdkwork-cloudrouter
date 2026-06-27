using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminCacheKeyItem
    {
        public string? ExpiresInSeconds { get; set; }
        public string InstanceName { get; set; }
        public string Key { get; set; }
        public string Namespace { get; set; }
        public string Status { get; set; }
    }
}
