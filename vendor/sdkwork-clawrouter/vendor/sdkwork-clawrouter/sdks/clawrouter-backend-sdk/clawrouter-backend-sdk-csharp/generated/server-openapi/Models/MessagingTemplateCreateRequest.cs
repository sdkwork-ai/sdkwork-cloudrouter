using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MessagingTemplateCreateRequest
    {
        public string BodyTemplate { get; set; }
        public string Category { get; set; }
        public string Channel { get; set; }
        public string? ContentFormat { get; set; }
        public string DeliveryPurpose { get; set; }
        public string? Locale { get; set; }
        public string SceneCode { get; set; }
        public string? SubjectTemplate { get; set; }
        public string TemplateCode { get; set; }
        public string TemplateName { get; set; }
        public Dictionary<string, string>? VariableSchema { get; set; }
    }
}
