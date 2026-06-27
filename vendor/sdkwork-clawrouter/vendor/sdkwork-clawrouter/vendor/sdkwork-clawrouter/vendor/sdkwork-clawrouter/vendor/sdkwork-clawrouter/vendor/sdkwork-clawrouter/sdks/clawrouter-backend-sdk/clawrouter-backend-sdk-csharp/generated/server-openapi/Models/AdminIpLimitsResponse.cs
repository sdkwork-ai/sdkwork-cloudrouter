using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminIpLimitsResponse
    {
        public List<AdminRateLimitItem> Items { get; set; }
    }
}
