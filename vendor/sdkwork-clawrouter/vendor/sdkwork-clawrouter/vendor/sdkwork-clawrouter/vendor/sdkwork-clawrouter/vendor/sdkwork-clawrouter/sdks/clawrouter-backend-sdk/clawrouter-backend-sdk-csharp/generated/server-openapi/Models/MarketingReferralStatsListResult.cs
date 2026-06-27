using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MarketingReferralStatsListResult
    {
        public string Code { get; set; }
        public AdminReferralStatsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
