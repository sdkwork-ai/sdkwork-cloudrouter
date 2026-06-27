using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ChannelGroupsListResult
    {
        public string Code { get; set; }
        public AppChannelGroupListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
