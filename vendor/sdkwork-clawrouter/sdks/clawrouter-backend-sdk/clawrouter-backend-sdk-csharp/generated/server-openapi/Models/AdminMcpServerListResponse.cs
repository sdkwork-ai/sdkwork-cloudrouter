using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMcpServerListResponse
    {
        public List<AdminMcpServerItem> Items { get; set; }
    }
}
