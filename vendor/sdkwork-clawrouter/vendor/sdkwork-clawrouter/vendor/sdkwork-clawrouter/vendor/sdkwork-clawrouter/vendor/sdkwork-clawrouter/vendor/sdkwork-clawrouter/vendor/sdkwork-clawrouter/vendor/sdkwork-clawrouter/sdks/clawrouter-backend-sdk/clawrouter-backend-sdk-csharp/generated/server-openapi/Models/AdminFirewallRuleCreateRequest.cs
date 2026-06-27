using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminFirewallRuleCreateRequest
    {
        public string Reason { get; set; }
        public string Type { get; set; }
        public string Value { get; set; }
    }
}
