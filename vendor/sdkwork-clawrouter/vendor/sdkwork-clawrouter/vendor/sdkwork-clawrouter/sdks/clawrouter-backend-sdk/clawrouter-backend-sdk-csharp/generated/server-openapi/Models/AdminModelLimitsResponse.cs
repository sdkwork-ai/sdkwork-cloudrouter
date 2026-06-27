using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminModelLimitsResponse
    {
        public List<AdminRateLimitItem> Items { get; set; }
    }
}
