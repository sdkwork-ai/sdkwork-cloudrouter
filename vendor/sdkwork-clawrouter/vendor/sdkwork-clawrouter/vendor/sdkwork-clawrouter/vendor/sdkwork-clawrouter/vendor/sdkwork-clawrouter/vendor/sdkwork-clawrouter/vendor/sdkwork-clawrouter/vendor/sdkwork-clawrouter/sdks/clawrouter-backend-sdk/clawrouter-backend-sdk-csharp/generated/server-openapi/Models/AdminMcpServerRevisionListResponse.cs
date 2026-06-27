using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMcpServerRevisionListResponse
    {
        public List<AdminMcpServerRevisionItem> Items { get; set; }
    }
}
