using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAiResourcesResponse
    {
        public List<AdminAiResourceItem> Items { get; set; }
    }
}
