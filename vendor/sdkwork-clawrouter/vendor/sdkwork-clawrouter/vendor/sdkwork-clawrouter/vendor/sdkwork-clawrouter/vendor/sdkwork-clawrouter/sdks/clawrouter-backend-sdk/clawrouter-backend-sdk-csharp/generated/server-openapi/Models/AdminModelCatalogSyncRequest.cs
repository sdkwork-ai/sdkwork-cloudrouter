using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminModelCatalogSyncRequest
    {
        public string? CatalogRoot { get; set; }
        public string? CatalogVersion { get; set; }
        public bool? Force { get; set; }
        public string? Mode { get; set; }
        public string? Source { get; set; }
        public List<string>? VendorCodes { get; set; }
    }
}
