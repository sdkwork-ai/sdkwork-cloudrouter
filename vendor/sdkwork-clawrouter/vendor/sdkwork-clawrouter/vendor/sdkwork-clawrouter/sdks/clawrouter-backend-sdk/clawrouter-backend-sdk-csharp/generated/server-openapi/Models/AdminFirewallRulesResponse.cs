using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminFirewallRulesResponse
    {
        public List<AdminFirewallItem> Items { get; set; }
    }
}
