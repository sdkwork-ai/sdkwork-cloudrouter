using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminIpLimitCreateRequest
    {
        public string BlockDuration { get; set; }
        public int Rpm { get; set; }
        public int Rps { get; set; }
        public string RuleName { get; set; }
        public string? Status { get; set; }
        public string TargetIp { get; set; }
    }
}
