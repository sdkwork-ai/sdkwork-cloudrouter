using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class RateLimitsIpListResult
    {
        public string Code { get; set; }
        public AdminIpLimitsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
