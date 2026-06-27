using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ChannelsUpdateResult
    {
        public string Code { get; set; }
        public AdminChannelMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
