using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class RouteExplainCreateResult
    {
        public string Code { get; set; }
        public AdminRuntimeRouteExplainResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
