using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class GatewayTracesResponse
    {
        public List<GatewayTrace> Items { get; set; }
    }
}
