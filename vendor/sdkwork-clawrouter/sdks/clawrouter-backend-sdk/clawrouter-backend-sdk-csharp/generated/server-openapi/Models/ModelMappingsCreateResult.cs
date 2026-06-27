using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelMappingsCreateResult
    {
        public string Code { get; set; }
        public AdminModelMappingMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
