using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminChannelGroupChannelBindingInput
    {
        public List<string>? ApiScope { get; set; }
        public List<string>? Capabilities { get; set; }
        public string ChannelId { get; set; }
        public int? Priority { get; set; }
        public List<string>? ResourceCodes { get; set; }
        public string? Status { get; set; }
        public int? Weight { get; set; }
    }
}
