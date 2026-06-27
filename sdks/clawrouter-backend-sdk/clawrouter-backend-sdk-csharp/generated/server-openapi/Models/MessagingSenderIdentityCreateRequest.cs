using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MessagingSenderIdentityCreateRequest
    {
        public string Channel { get; set; }
        public string? CountryCode { get; set; }
        public string? DisplayName { get; set; }
        public string? DomainName { get; set; }
        public string? FromEmail { get; set; }
        public string? FromName { get; set; }
        public string IdentityCode { get; set; }
        public string ProviderAccountId { get; set; }
        public string? ReplyTo { get; set; }
        public string? SenderId { get; set; }
        public string? SignName { get; set; }
    }
}
