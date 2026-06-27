using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelMappingsDeleteResult
    {
        public string Code { get; set; }
        public AdminModelMappingDeleteResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
