using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class BytedanceImageGenerationResponse
    {
        public int? Created { get; set; }
        public List<ArkImageGenerationData>? Data { get; set; }
        public ProviderTaskError? Error { get; set; }
        public string? Model { get; set; }
        public List<ArkWebSearchTool>? Tools { get; set; }
        public ArkImageUsage? Usage { get; set; }
    }
}
