using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class DiagnosticsRouteSimulationCreateResult
    {
        public string Code { get; set; }
        public MessagingRouteSimulationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
