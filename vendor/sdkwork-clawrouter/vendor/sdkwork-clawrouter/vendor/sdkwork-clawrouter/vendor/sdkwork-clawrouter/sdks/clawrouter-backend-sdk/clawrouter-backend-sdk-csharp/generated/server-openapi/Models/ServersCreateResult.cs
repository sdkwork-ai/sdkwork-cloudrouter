using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ServersCreateResult
    {
        public string Code { get; set; }
        public AdminMcpServerMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
