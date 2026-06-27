using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ServersBindingsListResult
    {
        public string Code { get; set; }
        public AdminMcpBindingListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
