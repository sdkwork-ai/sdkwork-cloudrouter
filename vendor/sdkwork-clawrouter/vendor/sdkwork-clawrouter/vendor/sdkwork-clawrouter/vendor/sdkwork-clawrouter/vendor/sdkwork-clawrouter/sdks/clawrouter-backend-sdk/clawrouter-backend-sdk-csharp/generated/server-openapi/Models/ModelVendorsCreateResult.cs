using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelVendorsCreateResult
    {
        public string Code { get; set; }
        public AdminModelVendorMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
