using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminRateLimitMutationResponse
    {
        public AdminRateLimitItem Item { get; set; }
    }
}
