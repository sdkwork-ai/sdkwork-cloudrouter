using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RoutingApiKeysListResult
    {
        public string Code { get; set; }
        public RoutingApiKeysResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
