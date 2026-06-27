using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class SiteCatalogListResult
    {
        public string Code { get; set; }
        public AdminSitesResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
