using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminChannelGroupsResponse
    {
        public List<AdminChannelGroupItem> Items { get; set; }
    }
}
