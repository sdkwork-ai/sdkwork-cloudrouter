using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ServiceProviderDownstreamCreateRequest
    {
        public string? DefaultCurrency { get; set; }
        public string? DefaultMultiplier { get; set; }
        public string DisplayName { get; set; }
        public string? PricePlanCode { get; set; }
        public string ProviderNo { get; set; }
        public string? ProviderType { get; set; }
        public string SellerProviderId { get; set; }
        public string? SettlementMode { get; set; }
    }
}
