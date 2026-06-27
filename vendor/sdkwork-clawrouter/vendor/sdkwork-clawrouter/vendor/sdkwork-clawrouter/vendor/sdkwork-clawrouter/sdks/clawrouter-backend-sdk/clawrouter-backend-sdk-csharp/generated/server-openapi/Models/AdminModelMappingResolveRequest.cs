using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminModelMappingResolveRequest
    {
        public string? ChannelCode { get; set; }
        public string? ChannelId { get; set; }
        public string? ProviderAccountCode { get; set; }
        public string? ProviderAccountId { get; set; }
        public string SourceModel { get; set; }
        public string? VendorCode { get; set; }
    }
}
