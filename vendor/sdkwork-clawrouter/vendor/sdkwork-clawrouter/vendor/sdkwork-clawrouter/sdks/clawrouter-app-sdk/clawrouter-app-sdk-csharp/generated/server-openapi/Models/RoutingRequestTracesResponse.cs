using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RoutingRequestTracesResponse
    {
        public List<RoutingRequestTraceItem> Items { get; set; }
    }
}
