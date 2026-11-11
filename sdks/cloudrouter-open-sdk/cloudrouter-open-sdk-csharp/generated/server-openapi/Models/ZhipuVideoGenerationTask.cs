using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ZhipuVideoGenerationTask
    {
        public int? Created { get; set; }
        public string? Id { get; set; }
        public List<ZhipuImageResult>? ImageResult { get; set; }
        public string? Model { get; set; }
        public string? RequestId { get; set; }
        public string? TaskStatus { get; set; }
        public List<ZhipuVideoResult>? VideoResult { get; set; }
    }
}
