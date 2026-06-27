using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAiResourceUpdateRequest
    {
        public string? ApiEndpointCode { get; set; }
        public string? CatalogKey { get; set; }
        public string? CompositionMode { get; set; }
        public string? DisplayName { get; set; }
        public List<AdminAiResourceMemberInput>? Members { get; set; }
        public string? ModalityCode { get; set; }
        public string? Model { get; set; }
        public string? ProviderNativeModel { get; set; }
        public string? ResourceCode { get; set; }
        public string? ResourceType { get; set; }
        public string? SortOrder { get; set; }
        public string? Status { get; set; }
        public string? VendorCode { get; set; }
    }
}
