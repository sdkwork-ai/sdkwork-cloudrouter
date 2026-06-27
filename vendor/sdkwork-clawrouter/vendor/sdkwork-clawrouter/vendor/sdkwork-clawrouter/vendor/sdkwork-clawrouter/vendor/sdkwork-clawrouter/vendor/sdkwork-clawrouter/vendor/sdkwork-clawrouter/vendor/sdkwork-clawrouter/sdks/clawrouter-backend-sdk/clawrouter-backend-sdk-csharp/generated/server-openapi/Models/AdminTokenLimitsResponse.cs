using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminTokenLimitsResponse
    {
        public List<AdminRateLimitItem> Items { get; set; }
    }
}
