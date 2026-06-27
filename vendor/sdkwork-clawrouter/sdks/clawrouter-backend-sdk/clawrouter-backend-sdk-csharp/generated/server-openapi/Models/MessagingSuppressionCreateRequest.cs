using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MessagingSuppressionCreateRequest
    {
        public string Channel { get; set; }
        public string? EndsAt { get; set; }
        public string? Note { get; set; }
        public string ReasonCode { get; set; }
        public string? ScopeId { get; set; }
        public string? ScopeType { get; set; }
        public string? Source { get; set; }
        public string StartsAt { get; set; }
        public string TargetHash { get; set; }
        public string TargetMasked { get; set; }
    }
}
