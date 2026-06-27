using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ChannelsListResult
    {
        public string Code { get; set; }
        public AdminChannelsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
