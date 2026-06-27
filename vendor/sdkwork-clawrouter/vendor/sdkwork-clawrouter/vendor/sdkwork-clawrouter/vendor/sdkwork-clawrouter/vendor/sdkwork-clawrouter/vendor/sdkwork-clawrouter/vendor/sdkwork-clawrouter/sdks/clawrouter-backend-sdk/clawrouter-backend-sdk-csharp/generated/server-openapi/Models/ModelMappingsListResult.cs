using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelMappingsListResult
    {
        public string Code { get; set; }
        public AdminModelMappingsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
