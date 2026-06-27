using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminChannelsResponse
    {
        public List<AdminChannelItem> Items { get; set; }
    }
}
