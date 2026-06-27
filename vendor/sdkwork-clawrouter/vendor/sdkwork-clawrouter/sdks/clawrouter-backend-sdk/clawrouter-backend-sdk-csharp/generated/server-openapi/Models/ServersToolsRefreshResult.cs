using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ServersToolsRefreshResult
    {
        public string Code { get; set; }
        public AdminMcpDiscoveryResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
