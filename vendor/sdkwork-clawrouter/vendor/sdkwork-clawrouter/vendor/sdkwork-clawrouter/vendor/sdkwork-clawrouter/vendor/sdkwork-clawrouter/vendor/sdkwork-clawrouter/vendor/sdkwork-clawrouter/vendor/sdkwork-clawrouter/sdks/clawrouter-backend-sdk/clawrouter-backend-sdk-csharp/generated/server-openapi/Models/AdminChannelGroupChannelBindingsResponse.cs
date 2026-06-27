using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminChannelGroupChannelBindingsResponse
    {
        public List<AdminChannelGroupChannelBindingItem> Items { get; set; }
    }
}
