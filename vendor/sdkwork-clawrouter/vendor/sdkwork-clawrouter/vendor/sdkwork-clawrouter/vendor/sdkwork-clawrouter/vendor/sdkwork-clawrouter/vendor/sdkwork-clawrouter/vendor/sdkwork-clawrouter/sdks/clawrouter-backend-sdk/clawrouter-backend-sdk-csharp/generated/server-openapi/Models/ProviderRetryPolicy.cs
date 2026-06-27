using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ProviderRetryPolicy
    {
        public int? BackoffMs { get; set; }
        public int MaxAttempts { get; set; }
        public List<int> RetryableStatusCodes { get; set; }
    }
}
