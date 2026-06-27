using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ServiceProviderPricingRuleUpdateRequest
    {
        public string? MinimumCharge { get; set; }
        public int? Priority { get; set; }
        public string? Status { get; set; }
        public string? UnitPrice { get; set; }
        public string? UnitSize { get; set; }
    }
}
