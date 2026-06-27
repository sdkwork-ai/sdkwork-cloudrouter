using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelVendorsListResult
    {
        public string Code { get; set; }
        public AdminModelVendorsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
