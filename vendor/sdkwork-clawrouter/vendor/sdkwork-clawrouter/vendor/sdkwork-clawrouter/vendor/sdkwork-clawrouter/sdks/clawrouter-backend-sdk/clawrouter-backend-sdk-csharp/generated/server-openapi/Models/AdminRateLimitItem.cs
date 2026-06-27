using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminRateLimitItem
    {
        public string? BlockDuration { get; set; }
        public int? Burst { get; set; }
        public string? ChannelGroup { get; set; }
        public string? ChannelGroupId { get; set; }
        public string? ChannelGroupName { get; set; }
        public string Id { get; set; }
        public string? KeyPrefix { get; set; }
        public string? Model { get; set; }
        public int? Rpd { get; set; }
        public int? Rpm { get; set; }
        public int? Rps { get; set; }
        public string? RuleName { get; set; }
        public string? Status { get; set; }
        public string? TargetIp { get; set; }
        public int? Tpm { get; set; }
        public string? User { get; set; }
    }
}
