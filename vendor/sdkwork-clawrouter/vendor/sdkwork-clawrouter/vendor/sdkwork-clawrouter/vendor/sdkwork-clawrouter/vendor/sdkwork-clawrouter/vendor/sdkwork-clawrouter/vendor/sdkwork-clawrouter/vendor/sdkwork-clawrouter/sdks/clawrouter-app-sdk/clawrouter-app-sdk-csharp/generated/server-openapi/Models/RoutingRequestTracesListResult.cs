using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RoutingRequestTracesListResult
    {
        public string Code { get; set; }
        public RoutingRequestTracesResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
