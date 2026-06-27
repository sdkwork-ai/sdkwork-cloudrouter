using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminSitesResponse
    {
        public List<AdminSiteItem> Items { get; set; }
    }
}
