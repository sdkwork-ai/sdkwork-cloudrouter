using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ServiceProviderPricingRuleCreateRequest
    {
        public string BillingMeterCode { get; set; }
        public string BuyerProviderId { get; set; }
        public string? CatalogKey { get; set; }
        public string? Currency { get; set; }
        public string? EdgeId { get; set; }
        public string MinimumCharge { get; set; }
        public string? Model { get; set; }
        public string? PricePlanId { get; set; }
        public int? Priority { get; set; }
        public string SellerProviderId { get; set; }
        public string? TokenKind { get; set; }
        public string UnitPrice { get; set; }
        public string UnitSize { get; set; }
    }
}
