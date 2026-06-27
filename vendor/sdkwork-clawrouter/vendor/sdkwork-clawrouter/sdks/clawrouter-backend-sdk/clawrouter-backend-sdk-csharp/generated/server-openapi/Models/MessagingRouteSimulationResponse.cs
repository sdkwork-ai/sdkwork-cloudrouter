using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MessagingRouteSimulationResponse
    {
        public bool Matched { get; set; }
        public string? RouteRuleId { get; set; }
        public List<Dictionary<string, string>> Targets { get; set; }
    }
}
