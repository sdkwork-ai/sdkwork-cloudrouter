using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ChannelsVerifyResult
    {
        public string Code { get; set; }
        public AdminChannelTestResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
