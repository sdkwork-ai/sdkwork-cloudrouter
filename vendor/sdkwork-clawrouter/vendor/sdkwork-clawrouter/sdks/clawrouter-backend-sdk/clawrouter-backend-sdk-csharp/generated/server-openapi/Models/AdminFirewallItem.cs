using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminFirewallItem
    {
        public string Id { get; set; }
        public string Reason { get; set; }
        public string Time { get; set; }
        public string Type { get; set; }
        public string Value { get; set; }
    }
}
