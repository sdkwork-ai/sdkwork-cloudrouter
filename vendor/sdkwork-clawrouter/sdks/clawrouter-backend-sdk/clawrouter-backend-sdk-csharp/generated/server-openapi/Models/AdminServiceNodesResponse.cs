using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminServiceNodesResponse
    {
        public List<AdminServiceNodeItem> Items { get; set; }
    }
}
