using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class GatewayTracesListResult
    {
        public string Code { get; set; }
        public GatewayTracesResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
