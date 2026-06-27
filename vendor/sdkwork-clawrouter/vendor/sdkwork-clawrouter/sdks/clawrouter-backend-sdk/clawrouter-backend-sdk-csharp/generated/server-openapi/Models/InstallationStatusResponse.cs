using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class InstallationStatusResponse
    {
        public string CatalogSource { get; set; }
        public string CatalogVersion { get; set; }
        public bool Changed { get; set; }
        public string Environment { get; set; }
        public bool ExternalCatalog { get; set; }
        public string LastCatalogRefreshStatus { get; set; }
        public string SchemaVersion { get; set; }
        public string SeedProfile { get; set; }
        public string Status { get; set; }
    }
}
