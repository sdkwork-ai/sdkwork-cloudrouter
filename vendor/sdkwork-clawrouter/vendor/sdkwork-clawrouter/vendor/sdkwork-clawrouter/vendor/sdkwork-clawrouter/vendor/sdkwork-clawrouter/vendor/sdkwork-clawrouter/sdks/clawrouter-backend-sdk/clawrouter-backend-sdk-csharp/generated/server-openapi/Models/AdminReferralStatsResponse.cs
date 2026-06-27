using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminReferralStatsResponse
    {
        public List<AdminReferralStatItem> Items { get; set; }
    }
}
