using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiImageEditRequest
    {
        public OpenAiImageReferenceInputList? Image { get; set; }
        public OpenAiImageReferenceInput? Mask { get; set; }
        public string Model { get; set; }
        public string Prompt { get; set; }
    }
}
