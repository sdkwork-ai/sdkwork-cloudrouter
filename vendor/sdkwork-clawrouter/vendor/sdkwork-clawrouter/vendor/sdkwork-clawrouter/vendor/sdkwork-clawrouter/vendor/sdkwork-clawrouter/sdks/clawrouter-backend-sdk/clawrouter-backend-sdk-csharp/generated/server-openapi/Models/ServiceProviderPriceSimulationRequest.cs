using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ServiceProviderPriceSimulationRequest
    {
        public string BillingMeterCode { get; set; }
        public string BuyerProviderId { get; set; }
        public string? CatalogKey { get; set; }
        public string? Model { get; set; }
        public string Quantity { get; set; }
        public string? TokenKind { get; set; }
    }
}
