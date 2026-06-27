using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ServersToolsListResult
    {
        public string Code { get; set; }
        public AdminMcpToolListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
