using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminModelMappingRuleBindingInput
    {
        public string? BindingCode { get; set; }
        public string? BindingId { get; set; }
        public string? BindingName { get; set; }
        public string BindingType { get; set; }
        public bool? Enabled { get; set; }
        public string? Id { get; set; }
    }
}
