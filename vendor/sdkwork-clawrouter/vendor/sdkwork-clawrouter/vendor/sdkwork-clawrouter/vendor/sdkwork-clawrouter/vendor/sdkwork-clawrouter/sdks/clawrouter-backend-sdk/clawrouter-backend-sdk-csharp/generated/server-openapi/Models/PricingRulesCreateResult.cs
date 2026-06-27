using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class PricingRulesCreateResult
    {
        public string Code { get; set; }
        public ServiceProviderPricingRuleMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
