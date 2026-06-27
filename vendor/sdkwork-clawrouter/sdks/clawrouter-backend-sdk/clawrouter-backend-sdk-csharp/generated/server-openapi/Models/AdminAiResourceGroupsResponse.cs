using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAiResourceGroupsResponse
    {
        public List<AdminAiResourceGroupItem> Items { get; set; }
    }
}
