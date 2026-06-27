using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminSiteChannelsResponse
    {
        public List<AdminSiteChannelItem> Items { get; set; }
    }
}
