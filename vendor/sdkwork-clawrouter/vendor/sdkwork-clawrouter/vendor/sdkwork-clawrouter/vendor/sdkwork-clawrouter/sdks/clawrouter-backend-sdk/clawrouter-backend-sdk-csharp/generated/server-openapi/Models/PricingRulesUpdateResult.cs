using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class PricingRulesUpdateResult
    {
        public string Code { get; set; }
        public ServiceProviderPricingRuleMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
