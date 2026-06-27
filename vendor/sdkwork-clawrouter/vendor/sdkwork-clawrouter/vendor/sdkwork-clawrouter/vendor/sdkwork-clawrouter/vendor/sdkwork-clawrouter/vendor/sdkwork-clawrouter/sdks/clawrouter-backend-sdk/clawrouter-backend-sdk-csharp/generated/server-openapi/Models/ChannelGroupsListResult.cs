using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ChannelGroupsListResult
    {
        public string Code { get; set; }
        public AdminChannelGroupsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
