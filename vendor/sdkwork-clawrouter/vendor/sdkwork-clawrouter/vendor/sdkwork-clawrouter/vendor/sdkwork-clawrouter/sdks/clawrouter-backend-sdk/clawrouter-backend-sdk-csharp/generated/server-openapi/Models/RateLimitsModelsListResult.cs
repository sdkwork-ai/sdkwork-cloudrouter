using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class RateLimitsModelsListResult
    {
        public string Code { get; set; }
        public AdminModelLimitsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
