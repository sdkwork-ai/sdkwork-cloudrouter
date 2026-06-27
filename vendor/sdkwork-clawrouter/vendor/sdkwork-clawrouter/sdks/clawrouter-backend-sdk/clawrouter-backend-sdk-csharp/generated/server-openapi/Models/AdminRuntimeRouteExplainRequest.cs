using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminRuntimeRouteExplainRequest
    {
        public string? ApiCode { get; set; }
        public string ApiKeyId { get; set; }
        public string? BillingMeter { get; set; }
        public string? Capability { get; set; }
        public string? CatalogKey { get; set; }
        public string? ChannelGroupId { get; set; }
        public string? Model { get; set; }
        public string? ResourceCode { get; set; }
        public string? RouteKey { get; set; }
    }
}
