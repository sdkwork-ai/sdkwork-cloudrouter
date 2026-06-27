using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ChannelGroupsChannelBindingsUpdateResult
    {
        public string Code { get; set; }
        public AdminChannelGroupChannelBindingsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
