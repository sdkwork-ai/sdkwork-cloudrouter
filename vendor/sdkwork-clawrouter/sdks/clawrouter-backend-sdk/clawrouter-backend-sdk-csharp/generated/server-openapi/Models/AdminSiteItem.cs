using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminSiteItem
    {
        public string BaseUrl { get; set; }
        public string? ConsecutiveErrorCount { get; set; }
        public string? Description { get; set; }
        public string DisplayName { get; set; }
        public string? DocsUrl { get; set; }
        public List<string>? Domains { get; set; }
        public string Environment { get; set; }
        public string HealthStatus { get; set; }
        public string Id { get; set; }
        public string? LastCheckedAt { get; set; }
        public string? LastLatencyMs { get; set; }
        public string? LastSyncAt { get; set; }
        public MediaResource? Logo { get; set; }
        public string? OwnerKind { get; set; }
        public string? RegionCode { get; set; }
        public string SiteCode { get; set; }
        public string SiteName { get; set; }
        public string SiteType { get; set; }
        public string? SortOrder { get; set; }
        public string Status { get; set; }
        public List<string>? VendorCodes { get; set; }
        public string? WebsiteUrl { get; set; }
    }
}
