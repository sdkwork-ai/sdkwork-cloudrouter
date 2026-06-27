using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ServiceNodesDeleteResult
    {
        public string Code { get; set; }
        public AdminServiceNodeDeleteResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
