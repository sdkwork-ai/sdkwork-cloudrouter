using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiImageEditMultipartRequest
    {
        public string Image { get; set; }
        public string? Mask { get; set; }
        public string Model { get; set; }
        public string Prompt { get; set; }
    }
}
