using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminSiteUpdateRequest
    {
        public string? BaseUrl { get; set; }
        public string? CredentialRef { get; set; }
        public string? Description { get; set; }
        public string? DisplayName { get; set; }
        public string? DocsUrl { get; set; }
        public List<string>? Domains { get; set; }
        public string? Environment { get; set; }
        public MediaResource? Logo { get; set; }
        public string? MaskedLabel { get; set; }
        public string? OwnerKind { get; set; }
        public string? RegionCode { get; set; }
        public string? SiteCode { get; set; }
        public string? SiteName { get; set; }
        public string? SiteType { get; set; }
        public string? Status { get; set; }
        public List<string>? VendorCodes { get; set; }
        public string? WebsiteUrl { get; set; }
    }
}
