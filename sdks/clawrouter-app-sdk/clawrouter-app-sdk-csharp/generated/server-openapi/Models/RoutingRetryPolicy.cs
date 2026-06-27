using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RoutingRetryPolicy
    {
        public string BackoffMs { get; set; }
        public string MaxAttempts { get; set; }
        public List<string> RetryableStatusCodes { get; set; }
    }
}
