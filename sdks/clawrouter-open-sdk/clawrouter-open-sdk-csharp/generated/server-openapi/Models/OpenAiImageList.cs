using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiImageList
    {
        public int Created { get; set; }
        public List<OpenAiImage> Data { get; set; }
        public OpenAiTokenUsage? Usage { get; set; }
    }
}
