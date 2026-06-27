using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminModelVendorCreateRequest
    {
        public string? Color { get; set; }
        public string? Description { get; set; }
        public string Name { get; set; }
        public string? Status { get; set; }
        public string? VendorCode { get; set; }
    }
}
