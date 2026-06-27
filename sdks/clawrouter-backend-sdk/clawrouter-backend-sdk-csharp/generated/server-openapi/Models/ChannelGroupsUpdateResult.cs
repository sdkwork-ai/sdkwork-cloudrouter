using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ChannelGroupsUpdateResult
    {
        public string Code { get; set; }
        public AdminChannelGroupMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
