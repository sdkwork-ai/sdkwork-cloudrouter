using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiImageVariationRequest
    {
        public OpenAiImageReferenceInput Image { get; set; }
        public string Model { get; set; }
        public string? Size { get; set; }
    }
}
