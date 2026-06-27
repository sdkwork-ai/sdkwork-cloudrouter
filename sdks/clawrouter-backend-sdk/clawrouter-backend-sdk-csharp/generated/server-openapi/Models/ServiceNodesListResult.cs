using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ServiceNodesListResult
    {
        public string Code { get; set; }
        public AdminServiceNodesResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
