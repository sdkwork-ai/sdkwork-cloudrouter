using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminModelVendorsResponse
    {
        public List<AdminModelVendorItem> Items { get; set; }
    }
}
