using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminChannelTestResponse
    {
        public string ChannelId { get; set; }
        public AdminChannelItem Item { get; set; }
        public string Latency { get; set; }
        public string Status { get; set; }
        public bool Success { get; set; }
    }
}
