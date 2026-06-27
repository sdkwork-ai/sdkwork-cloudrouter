using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMcpBindingListResponse
    {
        public List<AdminMcpBindingItem> Items { get; set; }
    }
}
