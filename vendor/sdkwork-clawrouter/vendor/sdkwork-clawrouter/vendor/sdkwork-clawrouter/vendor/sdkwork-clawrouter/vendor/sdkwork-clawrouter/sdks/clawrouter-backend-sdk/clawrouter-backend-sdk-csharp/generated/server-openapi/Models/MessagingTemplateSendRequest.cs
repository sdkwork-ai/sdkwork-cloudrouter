using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MessagingTemplateSendRequest
    {
        public string Channel { get; set; }
        public string? CountryCode { get; set; }
        public string DeliveryPurpose { get; set; }
        public bool? DryRun { get; set; }
        public string? Locale { get; set; }
        public string SceneCode { get; set; }
        public string TargetHash { get; set; }
        public string TargetMasked { get; set; }
        public string TemplateCode { get; set; }
        public string? UserSegment { get; set; }
        public Dictionary<string, string>? Variables { get; set; }
    }
}
