using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class RateLimitsModelsCreateResult
    {
        public string Code { get; set; }
        public AdminRateLimitMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
