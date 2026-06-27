using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ServiceNodesCreateResult
    {
        public string Code { get; set; }
        public AdminServiceNodeMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
