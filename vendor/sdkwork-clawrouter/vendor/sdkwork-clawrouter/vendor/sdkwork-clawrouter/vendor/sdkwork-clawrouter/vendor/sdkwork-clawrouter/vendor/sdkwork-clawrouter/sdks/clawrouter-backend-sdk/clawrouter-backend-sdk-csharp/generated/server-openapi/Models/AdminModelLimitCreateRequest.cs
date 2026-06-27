using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminModelLimitCreateRequest
    {
        public string ChannelGroup { get; set; }
        public string Model { get; set; }
        public int Rpm { get; set; }
        public string? Status { get; set; }
        public int Tpm { get; set; }
    }
}
