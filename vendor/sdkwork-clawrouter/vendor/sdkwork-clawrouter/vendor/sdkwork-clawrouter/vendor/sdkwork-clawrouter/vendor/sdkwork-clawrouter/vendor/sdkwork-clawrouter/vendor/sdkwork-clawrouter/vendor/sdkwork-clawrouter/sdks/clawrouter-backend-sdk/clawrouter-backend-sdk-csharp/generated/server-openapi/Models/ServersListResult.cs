using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ServersListResult
    {
        public string Code { get; set; }
        public AdminMcpServerListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
