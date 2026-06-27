using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMcpToolListResponse
    {
        public List<AdminMcpToolItem> Items { get; set; }
    }
}
