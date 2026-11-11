using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ZhipuImageGenerationResponse
    {
        public List<ZhipuContentFilter>? ContentFilter { get; set; }
        public int? Created { get; set; }
        public List<ZhipuImageResult>? Data { get; set; }
    }
}
