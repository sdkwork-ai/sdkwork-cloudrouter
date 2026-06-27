using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MessagingRouteRuleCreateRequest
    {
        public string Channel { get; set; }
        public string? CountryCode { get; set; }
        public string DeliveryPurpose { get; set; }
        public Dictionary<string, string>? FailoverPolicy { get; set; }
        public string? Locale { get; set; }
        public int? Priority { get; set; }
        public string RuleCode { get; set; }
        public string SceneCode { get; set; }
        public List<Dictionary<string, object>> Targets { get; set; }
        public string? UserSegment { get; set; }
    }
}
