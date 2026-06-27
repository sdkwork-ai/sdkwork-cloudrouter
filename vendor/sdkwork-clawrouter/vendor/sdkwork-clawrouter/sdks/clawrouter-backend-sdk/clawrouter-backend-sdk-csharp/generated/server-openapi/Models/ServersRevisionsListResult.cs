using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ServersRevisionsListResult
    {
        public string Code { get; set; }
        public AdminMcpServerRevisionListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
