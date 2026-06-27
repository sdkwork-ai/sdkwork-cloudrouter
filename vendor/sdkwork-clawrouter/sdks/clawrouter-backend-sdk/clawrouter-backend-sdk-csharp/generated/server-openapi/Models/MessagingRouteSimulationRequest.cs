using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MessagingRouteSimulationRequest
    {
        public string Channel { get; set; }
        public string? CountryCode { get; set; }
        public string DeliveryPurpose { get; set; }
        public string? Locale { get; set; }
        public string SceneCode { get; set; }
        public string? UserSegment { get; set; }
    }
}
