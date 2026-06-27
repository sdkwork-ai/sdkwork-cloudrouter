using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class RateLimitsApiKeysListResult
    {
        public string Code { get; set; }
        public AdminTokenLimitsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
