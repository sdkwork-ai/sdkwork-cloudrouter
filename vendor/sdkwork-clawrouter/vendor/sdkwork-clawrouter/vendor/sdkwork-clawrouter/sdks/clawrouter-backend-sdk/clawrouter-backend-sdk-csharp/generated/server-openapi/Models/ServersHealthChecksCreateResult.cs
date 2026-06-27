using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ServersHealthChecksCreateResult
    {
        public string Code { get; set; }
        public AdminMcpHealthCheckResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
